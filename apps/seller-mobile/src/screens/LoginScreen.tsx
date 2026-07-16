import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorBanner, Field, PrimaryButton } from "../components/ui";
import { getSupabase } from "../lib/supabase";
import { colors } from "../theme";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8) {
      setError("Ingresa un correo y una contraseña válida.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await getSupabase().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (authError) {
      setError("No fue posible iniciar sesión. Revisa tus credenciales.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>CrediCel</Text>
          <Text style={styles.subtitle}>Aplicación de vendedores</Text>
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Inicia sesión
          </Text>
          <Text style={styles.copy}>
            Usa el acceso asignado por tu organización.
          </Text>
          {error && <ErrorBanner message={error} />}
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Correo"
            onChangeText={setEmail}
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <Field
            autoCapitalize="none"
            autoComplete="current-password"
            label="Contraseña"
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          <PrimaryButton label="Ingresar" loading={loading} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.brandDark },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  brandBlock: { marginBottom: 22 },
  logo: { color: "#fff", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#bdd0c7", fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
  },
  title: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  copy: { color: colors.muted, lineHeight: 21, marginBottom: 20, marginTop: 6 },
});
