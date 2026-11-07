import type { TextStyle, ViewStyle } from "react-native";

// Every color, size, radius and shadow in the app comes from this file and ui.tsx.

export const colors = {
  page: "#EFE4CB",
  card: "#FFFBF1",
  field: "#F6EDD8",
  lineSoft: "#D9C69C",
  lineStrong: "#BFA87A",
  ink: "#241E16",
  muted: "#5E5342",
  accent: "#245C3E",
  accentTint: "#E1EBDD",
  gold: "#C88719",
  bannerGround: "#2E2417",
  bannerText: "#F7EBC8",
  errorGround: "#F4D3C8",
  errorText: "#7A2718",
  buyFill: "#205C3F",
  closeFill: "#F0B23E",
  passFill: "#8C2F22",
  noDataFill: "#62584A",
  onFill: "#FFFBF1",
  closeInk: "#2A1F08",
  scrimText: "#FFFBF1",
  // Soft text on each verdict surface.
  onFillSoftBuy: "#DCE8DC",
  onFillSoftPass: "#F2D8D0",
  onFillSoftNoData: "#E8E0D2",
  onFillSoftClose: "#5A430A",
  // Named in the brief for pills.
  freePill: "#F3E3B3",
  closePillGround: "#F7E3B0",
  closePillText: "#7A5510",
  passPillGround: "#F2D2CB",
  // Camera and overlay grounds. chipGround is bannerGround at 88 percent.
  chipGround: "rgba(46,36,23,0.88)",
  barGround: "rgba(46,36,23,0.92)",
  goldLine: "rgba(200,135,25,0.7)",
  cameraGround: "#14100B",
  shadow: "#33270F",
  dividerOnDark: "rgba(220,232,220,0.4)",
  dividerOnClose: "rgba(42,31,8,0.25)",
  scrim: "rgba(36,30,22,0.35)",
};

export type Call = "buy" | "close_call" | "pass" | "not_enough_sales";

/** Surface and text colors for a verdict, so no screen picks its own. */
export const verdictTheme: Record<Call, { fill: string; text: string; soft: string; divider: string; label: string }> = {
  buy: { fill: colors.buyFill, text: colors.onFill, soft: colors.onFillSoftBuy, divider: colors.dividerOnDark, label: "BUY" },
  close_call: { fill: colors.closeFill, text: colors.closeInk, soft: colors.closeInk, divider: colors.dividerOnClose, label: "CLOSE CALL" },
  pass: { fill: colors.passFill, text: colors.onFill, soft: colors.onFillSoftPass, divider: colors.dividerOnDark, label: "PASS" },
  not_enough_sales: { fill: colors.noDataFill, text: colors.onFill, soft: colors.onFillSoftNoData, divider: colors.dividerOnDark, label: "NOT ENOUGH SALES" },
};

/** Stripe and pill colors for history cards. */
export const callPill: Record<Call, { ground: string; text: string; stripe: string; label: string }> = {
  buy: { ground: colors.accentTint, text: colors.accent, stripe: colors.buyFill, label: "Buy" },
  close_call: { ground: colors.closePillGround, text: colors.closePillText, stripe: colors.closeFill, label: "Close call" },
  pass: { ground: colors.passPillGround, text: colors.errorText, stripe: colors.passFill, label: "Pass" },
  not_enough_sales: { ground: colors.field, text: colors.muted, stripe: colors.noDataFill, label: "Not enough sales" },
};

export const fonts = {
  display600: "Fraunces_600SemiBold",
  display700: "Fraunces_700Bold",
  text400: "Inter_400Regular",
  text500: "Inter_500Medium",
  text600: "Inter_600SemiBold",
  text700: "Inter_700Bold",
  text800: "Inter_800ExtraBold",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const layout = {
  screenPad: 20,
  cardPad: 20,
  cardGap: 14,
  sectionGap: 28,
  rowPad: 14,
  minTouch: 48,
  tagFieldHeight: 64,
  settingsFieldHeight: 60,
  buttonHeight: 56,
};

export const radius = { card: 20, button: 16, field: 14, sheetTop: 24, pill: 999, guide: 6, tile: 18 };

export const shadow: { card: ViewStyle; verdict: ViewStyle } = {
  card: { shadowColor: colors.shadow, shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 },
  verdict: { shadowColor: colors.shadow, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 5 },
};

export const opacity = { pressed: 0.85, disabled: 0.45 };

const t = (size: number, line: number, family: string, color: string, extra: TextStyle = {}): TextStyle => ({
  fontSize: size,
  lineHeight: line,
  fontFamily: family,
  color,
  ...extra,
});

export const type = {
  display: t(40, 44, fonts.display700, colors.ink),
  wordmark: t(34, 38, fonts.display700, colors.ink),
  screenTitle: t(26, 32, fonts.text800, colors.ink),
  itemName: t(22, 28, fonts.text700, colors.ink),
  medianFigure: t(40, 44, fonts.display700, colors.ink),
  verdictWord: t(38, 42, fonts.text800, colors.ink, { letterSpacing: 0.5 }),
  verdictFigure: t(28, 32, fonts.text800, colors.ink),
  tagInput: t(36, 40, fonts.text800, colors.ink),
  cardLabel: t(12, 16, fonts.text700, colors.muted, { letterSpacing: 1.1, textTransform: "uppercase" }),
  body: t(16, 23, fonts.text400, colors.ink),
  bodyStrong: t(16, 23, fonts.text700, colors.ink),
  small: t(13, 18, fonts.text400, colors.muted),
  smallStrong: t(13, 18, fonts.text700, colors.ink),
  caption: t(12, 16, fonts.text400, colors.muted),
  buttonLabel: t(17, 22, fonts.text700, colors.ink),
  priceFigure: t(30, 34, fonts.text800, colors.ink),
  // Smaller named pieces used by the brief for chrome, pills and fields.
  headerTitle: t(17, 22, fonts.text700, colors.ink),
  chromeLink: t(15, 20, fonts.text700, colors.scrimText),
  chromePill: t(13, 18, fonts.text800, colors.onFill),
  chromeLabel: t(13, 18, fonts.text600, colors.scrimText),
  segment: t(15, 20, fonts.text600, colors.scrimText),
  segmentOn: t(15, 20, fonts.text700, colors.onFill),
  shutterWord: t(13, 18, fonts.text700, colors.scrimText),
  lookingUp: t(15, 20, fonts.text600, colors.scrimText),
  pillText: t(12, 16, fonts.text800, colors.ink),
  samplePillStrong: t(12, 16, fonts.text700, colors.bannerText, { letterSpacing: 0.4 }),
  samplePillSoft: t(12, 16, fonts.text400, colors.bannerText),
  sampleChip: t(10, 14, fonts.text700, colors.bannerText),
  conditionChip: t(11, 15, fonts.text600, colors.muted),
  choiceChip: t(14, 20, fonts.text700, colors.ink),
  freePillText: t(13, 18, fonts.text700, colors.ink),
  tileLetters: t(24, 28, fonts.display700, colors.onFill),
  stepNumber: t(13, 18, fonts.text800, colors.accent),
  dollarSign: t(28, 32, fonts.text700, colors.muted),
  settingsUnit: t(20, 24, fonts.text700, colors.muted),
  settingsInput: t(22, 28, fonts.text800, colors.ink),
  checkGlyph: t(13, 18, fonts.text800, colors.onFill),
  bestValue: t(11, 15, fonts.text800, colors.onFill),
  emptyBadge: t(11, 15, fonts.text800, colors.accent),
};
