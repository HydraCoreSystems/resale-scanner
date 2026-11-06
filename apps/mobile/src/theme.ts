// Warm neutral palette. Phil dislikes stark white, so the page is beige and cards are a slightly lighter cream.
export const colors = {
  page: "#F1E8D8",
  card: "#F9F3E7",
  line: "#DACDB5",
  text: "#2B2620",
  muted: "#6E6556",
  accent: "#2F6B4F",
  accentText: "#F9F3E7",
  buy: "#2F6B4F",
  close: "#B7791F",
  pass: "#9A3B2E",
  neutral: "#6E6556",
  banner: "#E8D7A8",
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const type = {
  big: { fontSize: 44, fontWeight: "800" as const, color: colors.text },
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 17, color: colors.text },
  small: { fontSize: 14, color: colors.muted },
};
