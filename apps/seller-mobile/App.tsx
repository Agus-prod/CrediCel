import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorBanner } from "./src/components/ui";
import { getConfigurationError, getSupabase } from "./src/lib/supabase";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NewApplicationScreen } from "./src/screens/NewApplicationScreen";
import { PortfolioScreen } from "./src/screens/PortfolioScreen";
import { colors } from "./src/theme";

type Tab = "inventory" | "portfolio" | "application";

const tabs: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: "inventory", label: "Inventario" },
  { id: "portfolio", label: "Mi cartera" },
  { id: "application", label: "Nueva solicitud" },
];

export default function App() {
  const configurationError = getConfigurationError();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (configurationError) {
      setInitializing(false);
      return;
    }
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setInitializing(false);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, [configurationError]);

  useEffect(() => {
    if (configurationError) return;
    const supabase = getSupabase();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => listener.remove();
  }, [configurationError]);

  if (configurationError) {
    return (
      <SafeAreaView style={styles.centeredPage}>
        <StatusBar style="dark" />
        <View style={styles.configurationCard}>
          <Text accessibilityRole="header" style={styles.configurationTitle}>
            Configuración pendiente
          </Text>
          <ErrorBanner message={configurationError} />
          <Text style={styles.configurationCopy}>
            Copia las variables documentadas en .env.example y reinicia Expo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (initializing) {
    return (
      <SafeAreaView style={styles.centeredPage}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.loadingText}>Restaurando sesión…</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.loginPage}>
        <StatusBar style="light" />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  const signOut = async () => {
    setLogoutError(null);
    const { error } = await getSupabase().auth.signOut();
    if (error) setLogoutError("No fue posible cerrar la sesión.");
  };

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.logo}>CrediCel</Text>
          <Text numberOfLines={1} style={styles.userEmail}>
            {session.user.email ?? "Vendedor autorizado"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>
      {logoutError && <ErrorBanner message={logoutError} />}
      <View style={styles.content}>
        {activeTab === "inventory" && <InventoryScreen />}
        {activeTab === "portfolio" && (
          <PortfolioScreen userId={session.user.id} />
        )}
        {activeTab === "application" && (
          <NewApplicationScreen userId={session.user.id} />
        )}
      </View>
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  loginPage: { flex: 1, backgroundColor: colors.brandDark },
  centeredPage: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  configurationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 520,
    padding: 20,
    width: "100%",
  },
  configurationTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 14,
  },
  configurationCopy: { color: colors.muted, lineHeight: 20 },
  loadingText: { color: colors.muted, marginTop: 12 },
  header: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCopy: { flex: 1, marginRight: 12 },
  logo: { color: "#fff", fontSize: 24, fontWeight: "900" },
  userEmail: { color: "#bdd0c7", fontSize: 11, marginTop: 2 },
  logoutButton: {
    alignItems: "center",
    borderColor: "#ffffff30",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 58,
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  content: { flex: 1 },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 51,
    paddingHorizontal: 4,
  },
  tabSelected: { backgroundColor: "#e7f4ef" },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  tabTextSelected: { color: colors.brand, fontWeight: "900" },
});
