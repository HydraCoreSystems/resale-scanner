import type { ReactNode, Ref } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from "react-native";
import type { DataSource } from "./api";
import { colors, fonts, layout, opacity, radius, shadow, space, type, verdictTheme, type Call } from "./theme";

export type InputHandle = TextInputInstance;

export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "n/a" : n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;

export function niceDate(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const NOT_AN_APPRAISAL = "Based on recorded eBay sales. An estimate of what you would keep, not an appraisal.";

type ButtonKind = "primary" | "quiet" | "dangerQuiet";

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
  kind?: ButtonKind;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const labelColor = kind === "primary" ? colors.onFill : kind === "dangerQuiet" ? colors.errorText : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        kind === "primary" && styles.buttonPrimary,
        kind === "quiet" && styles.buttonQuiet,
        kind === "dangerQuiet" && styles.buttonDanger,
        disabled && { opacity: opacity.disabled },
        pressed && { opacity: opacity.pressed },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={labelColor} /> : <Text style={[type.buttonLabel, { color: labelColor }]}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}


/** A card with a colored stripe down the left edge. The shadow stays on the outer view, the clip is inside. */
export function StripeCard({
  stripe,
  children,
  padding = layout.cardPad,
  style,
}: {
  stripe: string;
  children: ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, { padding: 0 }, style]}>
      <View style={{ borderRadius: radius.card - 1, overflow: "hidden", padding, paddingLeft: padding + 5 }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, borderRadius: radius.pill, backgroundColor: stripe }} />
        {children}
      </View>
    </View>
  );
}

/** Check mark drawn from two edges so it renders the same on every platform. */
export function CheckMark({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size * 0.26,
          height: size * 0.46,
          borderRightWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: colors.onFill,
          transform: [{ rotate: "45deg" }, { translateY: -size * 0.04 }],
        }}
      />
    </View>
  );
}

/** Standing disclosure when numbers or names come from built in sample data. Left aligned, self sized. */
export function SamplePill({ source, style }: { source: DataSource | undefined; style?: StyleProp<ViewStyle> }) {
  if (source !== "mock") return null;
  return (
    <View style={[styles.samplePill, style]} accessibilityLabel="Sample data. Not real sales.">
      <View style={styles.sampleDot} />
      <Text style={type.samplePillStrong}>Sample data</Text>
      <Text style={type.samplePillSoft}>Not real sales</Text>
    </View>
  );
}

/** Small inline marking for history rows. */
export function SampleChip({ source }: { source: DataSource | undefined }) {
  if (source !== "mock") return null;
  return (
    <View style={styles.sampleChip} accessibilityLabel="Sample data">
      <Text style={type.sampleChip}>Sample</Text>
    </View>
  );
}

export function ErrorCard({ message, compact, style }: { message: string | null; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  return (
    <View style={[styles.errorCard, compact && { padding: space.md }, style]} accessibilityRole="alert">
      <Text style={[type.smallStrong, { color: colors.errorText }]}>{message}</Text>
    </View>
  );
}

export function LedgerRow({
  label,
  value,
  bold,
  tone,
  last,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: Call;
  last?: boolean;
}) {
  const color = tone ? verdictTheme[tone].text : colors.ink;
  const divider = tone ? verdictTheme[tone].divider : colors.lineSoft;
  const weight = bold ? { fontFamily: fonts.text800 } : null;
  return (
    <View style={[styles.ledgerRow, !last && { borderBottomWidth: 1, borderBottomColor: divider }]}>
      <Text style={[type.body, weight, { color, flex: 1 }]}>{label}</Text>
      <Text style={[type.body, weight, { color, textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choiceChip, selected && styles.choiceChipOn, pressed && { opacity: opacity.pressed }]}
    >
      <Text style={[type.choiceChip, selected && { color: colors.onFill }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: space.sm }, style]}>
      <Text style={type.cardLabel}>{children}</Text>
    </View>
  );
}

/** Small filled pill used for calls and plan status. */
export function Pill({ label, ground, textColor, style }: { label: string; ground: string; textColor: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: ground }, style]}>
      <Text style={[type.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

/** A visible field box. The whole box is the tap target and focuses the input. */
export function FieldBox({
  prefix,
  suffix,
  height = layout.settingsFieldHeight,
  filled,
  inputStyle,
  prefixStyle,
  inputRef,
  ...input
}: TextInputProps & {
  prefix?: string;
  suffix?: string;
  height?: number;
  filled?: boolean;
  inputStyle?: object;
  prefixStyle?: object;
  inputRef?: Ref<InputHandle>;
}) {
  return (
    <View
      style={[
        styles.fieldBox,
        { height },
        filled && { borderColor: colors.accent, borderWidth: 2 },
      ]}
    >
      {prefix ? <Text style={[type.settingsUnit, prefixStyle]}>{prefix}</Text> : null}
      <TextInput
        ref={inputRef}
        placeholderTextColor={colors.muted}
        style={[type.settingsInput, { flex: 1, minWidth: 0, height: "100%", paddingVertical: 0 }, webNoOutline, inputStyle]}
        {...input}
      />
      {suffix ? <Text style={[type.settingsUnit, prefixStyle]}>{suffix}</Text> : null}
    </View>
  );
}

/** Multi line words field used on Confirm. */
export function WordsField(props: TextInputProps) {
  return (
    <TextInput
      multiline
      placeholderTextColor={colors.muted}
      {...props}
      style={[type.body, styles.wordsField, props.style]}
    />
  );
}

// The browser preview draws a focus ring around inputs. Phones do not, so this only matters on web.
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

const styles = StyleSheet.create({
  button: { height: layout.buttonHeight, borderRadius: radius.button, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xxl },
  buttonPrimary: { backgroundColor: colors.accent, ...shadow.card },
  buttonQuiet: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineStrong },
  buttonDanger: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.lineSoft },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: layout.cardPad,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    ...shadow.card,
  },
  samplePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.bannerGround,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
  sampleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  sampleChip: { backgroundColor: colors.bannerGround, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: space.sm },
  errorCard: { backgroundColor: colors.errorGround, borderRadius: radius.button, padding: space.lg },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.lg, paddingVertical: 6 },
  choiceChip: {
    height: 44,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  choiceChipOn: { backgroundColor: colors.accent, borderWidth: 0, paddingHorizontal: 19 },
  pill: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.field,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: space.lg,
  },
  wordsField: {
    backgroundColor: colors.field,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 14,
    minHeight: 76,
    textAlignVertical: "top",
  },
});
