import { DEFAULT_SETTINGS, type VerdictSettings } from "@rs/core";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSession } from "../src/session";
import { useVerdictSettings } from "../src/settings";
import { colors, layout, space, type } from "../src/theme";
import { Button, Card, FieldBox, Pill, SectionLabel } from "../src/ui";

type Field = { key: keyof VerdictSettings; label: string; unit: "$" | "%"; help: string };

const FIELDS: Field[] = [
  { key: "feePercent", label: "Selling fee", unit: "%", help: "eBay's rate for most categories is 13.6% as of Nov 2026. Some categories differ." },
  { key: "shipping", label: "Shipping estimate", unit: "$", help: "A flat guess per sale. Heavy or tiny items differ, so change it to fit what you sell." },
  { key: "minProfit", label: "Buy needs profit of at least", unit: "$", help: "Dollars you want left after fees, shipping and the tag." },
  { key: "minReturnPercent", label: "Buy needs return of at least", unit: "%", help: "Profit as a share of what you pay." },
];

export default function Settings() {
  const router = useRouter();
  const { settings, loaded, update } = useVerdictSettings();
  const { entitlement, signOut } = useSession();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loaded) setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key] ?? "")])));
  }, [loaded, settings]);

  const commit = (f: Field) => {
    const n = Number((draft[f.key] ?? "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n < 0) return;
    void update({ ...settings, [f.key]: n });
  };

  const paid = entitlement?.plan === "paid";

  return (
    <ScrollView
      contentContainerStyle={{ padding: layout.screenPad, paddingBottom: layout.sectionGap * 2 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={type.screenTitle}>Your call settings</Text>
      <Text style={[type.small, { marginTop: space.sm }]}>
        These change how the Buy, Close call and Pass answer is worked out. Calls need at least {settings.minSales} recorded sales.
      </Text>

      <Card style={{ marginTop: space.xl, gap: space.xxl }}>
        {FIELDS.map((f) => (
          <View key={f.key}>
            <SectionLabel>{f.label}</SectionLabel>
            <FieldBox
              value={draft[f.key] ?? ""}
              onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
              onEndEditing={() => commit(f)}
              keyboardType="decimal-pad"
              prefix={f.unit === "$" ? "$" : undefined}
              suffix={f.unit === "%" ? "%" : undefined}
              accessibilityLabel={f.label}
            />
            <Text style={[type.small, { marginTop: space.sm }]}>{f.help}</Text>
          </View>
        ))}
      </Card>

      <Button label="Reset to starting values" kind="quiet" onPress={() => void update(DEFAULT_SETTINGS)} style={{ marginTop: space.xl }} />

      <View style={{ marginTop: layout.sectionGap }}>
        <SectionLabel>Account</SectionLabel>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.md }}>
            <Text style={type.bodyStrong}>{paid ? "Subscribed" : "Free plan"}</Text>
            <Pill
              label={`${entitlement?.totalRemaining ?? 0} scans left`}
              ground={paid ? colors.accentTint : colors.field}
              textColor={paid ? colors.accent : colors.muted}
            />
          </View>
        </Card>
      </View>

      <View style={{ marginTop: space.md, gap: space.md }}>
        <Button label="Get more scans" onPress={() => router.push("/paywall")} />
        <Button label="Sign out" kind="dangerQuiet" onPress={() => void signOut()} />
      </View>

      <Text style={[type.caption, { marginTop: space.lg }]}>
        Photos are sent for one scan only and are not kept. Scan results are saved to your account so you can find them again.
      </Text>
    </ScrollView>
  );
}
