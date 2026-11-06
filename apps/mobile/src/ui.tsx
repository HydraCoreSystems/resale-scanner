import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, space, type } from "./theme";
import type { DataSource } from "./api";

export const money = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : `$${n.toFixed(2)}`);

export function niceDate(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "quiet";
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonQuiet,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.accentText : colors.text} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? colors.accentText : colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Shown whenever numbers come from built in sample data, so they can never be mistaken for real sales. */
export function SampleBanner({ source }: { source: DataSource | undefined }) {
  if (source !== "mock") return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Sample data. These are not real sales.</Text>
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={[styles.banner, { backgroundColor: "#EBC9C0" }]}>
      <Text style={[styles.bannerText, { color: colors.pass }]}>{message}</Text>
    </View>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, bold && { fontWeight: "800" }]}>{label}</Text>
      <Text style={[type.body, bold && { fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

export const NOT_AN_APPRAISAL = "Based on recorded eBay sales. An estimate of what you would keep, not an appraisal.";

const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonQuiet: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.line },
  banner: { backgroundColor: colors.banner, borderRadius: 10, padding: space.sm + 2, marginBottom: space.md },
  bannerText: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});
