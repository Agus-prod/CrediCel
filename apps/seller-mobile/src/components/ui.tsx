import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { colors } from "../theme";

export function ErrorBanner({ message }: { readonly message: string }) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={styles.error}
    >
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { readonly message: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.success}>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function LoadingState({
  label = "Cargando…",
}: {
  readonly label?: string;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.loading}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  readonly title: string;
  readonly detail: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly secondary?: boolean;
}) {
  const unavailable = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        unavailable && styles.buttonDisabled,
        pressed && !unavailable && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.brand : "#fff"} />
      ) : (
        <Text
          style={[styles.buttonText, secondary && styles.secondaryButtonText]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  optional = false,
  ...inputProps
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly keyboardType?: KeyboardTypeOptions;
  readonly optional?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText" | "keyboardType">) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? " (opcional)" : ""}
      </Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#87958f"
        style={styles.input}
        value={value}
        {...inputProps}
      />
    </View>
  );
}

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
}

export function ChoiceGroup<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  readonly label: string;
  readonly choices: readonly Choice<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={choice.value}
              onPress={() => onChange(choice.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.choiceTextSelected,
                ]}
              >
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SectionCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    backgroundColor: colors.dangerBackground,
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
  },
  errorText: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: {
    backgroundColor: colors.successBackground,
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
  },
  successText: { color: colors.success, fontSize: 14, lineHeight: 20 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 30,
  },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  empty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 7,
    margin: 16,
    padding: 28,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  button: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryButton: {
    backgroundColor: "#e7f4ef",
    borderColor: "#b9d9cc",
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryButtonText: { color: colors.brand },
  field: { gap: 7, marginBottom: 15 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  input: {
    backgroundColor: "#fbfdfc",
    borderColor: colors.line,
    borderRadius: 11,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    backgroundColor: "#f4f7f5",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  choiceSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  choiceText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  choiceTextSelected: { color: "#fff" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16,
    padding: 18,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
  },
});
