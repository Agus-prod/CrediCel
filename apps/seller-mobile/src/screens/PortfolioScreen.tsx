import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  EmptyState,
  ErrorBanner,
  LoadingState,
  PrimaryButton,
} from "../components/ui";
import { getSupabase } from "../lib/supabase";
import { colors } from "../theme";
import { one, type PortfolioCustomer, type Relation } from "../types";

interface RawAssignment {
  readonly id: string;
  readonly customers: Relation<{
    readonly id: string;
    readonly first_name: string;
    readonly last_name: string;
    readonly normalized_dni: string;
    readonly phone: string;
  }>;
  readonly branches: Relation<{ readonly name: string }>;
}

export function PortfolioScreen({ userId }: { readonly userId: string }) {
  const [customers, setCustomers] = useState<readonly PortfolioCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const { data, error: queryError } = await getSupabase()
        .from("customer_assignments")
        .select(
          "id,customers(id,first_name,last_name,normalized_dni,phone),branches(name)",
        )
        .eq("salesperson_id", userId)
        .is("ended_at", null)
        .order("assigned_at", { ascending: false });
      if (queryError) {
        setError("No se pudo cargar tu cartera asignada.");
      } else {
        const rows = (data ?? []) as unknown as readonly RawAssignment[];
        setCustomers(
          rows.flatMap((row) => {
            const customer = one(row.customers);
            if (!customer) return [];
            return [
              {
                assignmentId: row.id,
                customerId: customer.id,
                name: `${customer.first_name} ${customer.last_name}`,
                dni: customer.normalized_dni,
                phone: customer.phone,
                branch: one(row.branches)?.name ?? "Tienda autorizada",
              },
            ];
          }),
        );
      }
      setLoading(false);
      setRefreshing(false);
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Cargando tu cartera…" />;

  return (
    <FlatList
      ListEmptyComponent={
        <EmptyState
          detail="Los clientes aparecerán cuando una solicitud los asigne a tu cartera."
          title="Aún no tienes clientes"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Mi cartera
          </Text>
          <Text style={styles.copy}>
            Solo se muestran asignaciones activas a tu usuario.
          </Text>
          {error && (
            <>
              <ErrorBanner message={error} />
              <PrimaryButton
                label="Reintentar"
                onPress={() => void load()}
                secondary
              />
            </>
          )}
        </View>
      }
      contentContainerStyle={styles.list}
      data={customers}
      keyExtractor={(customer) => customer.assignmentId}
      refreshControl={
        <RefreshControl
          colors={[colors.brand]}
          onRefresh={() => void load(true)}
          refreshing={refreshing}
          tintColor={colors.brand}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.detail}>
            DNI {item.dni} · {item.branch}
          </Text>
          <Pressable
            accessibilityLabel={`Llamar a ${item.name}`}
            accessibilityRole="button"
            onPress={() => void Linking.openURL(`tel:${item.phone}`)}
            style={styles.phoneButton}
          >
            <Text style={styles.phone}>{item.phone}</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, padding: 16, paddingBottom: 110 },
  header: { marginBottom: 14 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: 14, marginTop: 5 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  name: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  phoneButton: {
    alignSelf: "flex-start",
    backgroundColor: "#e7f4ef",
    borderRadius: 999,
    marginTop: 12,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  phone: { color: colors.brand, fontSize: 14, fontWeight: "800" },
});
