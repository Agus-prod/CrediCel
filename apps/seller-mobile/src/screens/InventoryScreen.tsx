import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
import { one, type InventoryDevice, type Relation } from "../types";

interface RawInventoryDevice {
  readonly id: string;
  readonly current_branch_id: string;
  readonly imei_1: string;
  readonly color: string | null;
  readonly storage_capacity: string | null;
  readonly cash_price: number;
  readonly product_brands: Relation<{ readonly name: string }>;
  readonly product_models: Relation<{ readonly name: string }>;
  readonly branches: Relation<{ readonly name: string }>;
}

export function InventoryScreen() {
  const [devices, setDevices] = useState<readonly InventoryDevice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabase()
      .from("inventory_units")
      .select(
        "id,current_branch_id,imei_1,color,storage_capacity,cash_price,product_brands(name),product_models(name),branches(name)",
      )
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError("No se pudo cargar el inventario autorizado.");
    } else {
      const rows = (data ?? []) as unknown as readonly RawInventoryDevice[];
      setDevices(
        rows.map((row) => ({
          id: row.id,
          branchId: row.current_branch_id,
          imei: row.imei_1,
          brand: one(row.product_brands)?.name ?? "Marca",
          model: one(row.product_models)?.name ?? "Modelo",
          color: row.color ?? "Sin color",
          storage: row.storage_capacity ?? "",
          cashPrice: Number(row.cash_price),
          branch: one(row.branches)?.name ?? "Tienda autorizada",
        })),
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return devices;
    return devices.filter((device) =>
      [device.imei, device.brand, device.model, device.branch]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [devices, search]);

  if (loading) return <LoadingState label="Cargando dispositivos…" />;

  return (
    <FlatList
      ListEmptyComponent={
        <EmptyState
          detail="No hay equipos disponibles dentro de tus tiendas autorizadas."
          title="Sin dispositivos"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Inventario disponible
          </Text>
          <Text style={styles.copy}>
            La seguridad por tienda se aplica desde Supabase RLS.
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
          <TextInput
            accessibilityLabel="Buscar inventario"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Buscar por IMEI, modelo o tienda"
            placeholderTextColor="#87958f"
            style={styles.search}
            value={search}
          />
          <Text style={styles.count}>{filtered.length} disponibles</Text>
        </View>
      }
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(device) => device.id}
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
          <View style={styles.row}>
            <Text style={styles.model}>
              {item.brand} {item.model}
            </Text>
            <Text style={styles.price}>L {item.cashPrice.toFixed(2)}</Text>
          </View>
          <Text style={styles.imei}>IMEI {item.imei}</Text>
          <Text style={styles.detail}>
            {item.color} · {item.storage || "Sin capacidad"} · {item.branch}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, padding: 16, paddingBottom: 110 },
  header: { marginBottom: 14 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: 16, marginTop: 5 },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  count: { color: colors.muted, fontSize: 12, marginTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  model: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: "800" },
  price: { color: colors.brand, fontSize: 15, fontWeight: "800" },
  imei: { color: colors.ink, fontFamily: "monospace", marginTop: 11 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
});
