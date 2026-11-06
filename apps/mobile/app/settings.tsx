import { DEFAULT_SETTINGS, type VerdictSettings } from "@rs/core";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSession } from "../src/session";
import { useVerdictSettings } from "../src/settings";
import { colors, space, type } from "../src/theme";
import { Button, Card } from "../src/ui";

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

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl * 2 }} keyboardShouldPersistTaps="handled">
      <Text style={type.title}>Your call settings</Text>
      <Text style={type.small}>These change how the Buy, Close call and Pass answer is worked out. Calls need at least {settings.minSales} recorded sales.</Text>
      {FIELDS.map((f) => (
        <Card key={f.key}>
          <Text style={[type.body, { fontWeight: "700" }]}>{f.label}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 6 }}>
            {f.unit === "$" ? <Text style={type.title}>$</Text> : null}
            <TextInput
              value={draft[f.key] ?? ""}
              onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
              onEndEditing={() => commit(f)}
              keyboardType="decimal-pad"
              style={{ fontSize: 24, fontWeight: "800", color: colors.text, minWidth: 80 }}
            />
            {f.unit === "%" ? <Text style={type.title}>%</Text> : null}
          </View>
          <Text style={type.small}>{f.help}</Text>
        </Card>
      ))}
      <Button label="Reset to starting values" kind="quiet" onPress={() => void update(DEFAULT_SETTINGS)} />

      <Text style={[type.title, { marginTop: space.md }]}>Account</Text>
      <Card>
        <Text style={type.body}>
          {entitlement?.plan === "paid" ? "Subscribed." : "Free plan."} {entitlement?.totalRemaining ?? 0} scans left.
        </Text>
      </Card>
      <Button label="Get more scans" onPress={() => router.push("/paywall")} />
      <Button label="Sign out" kind="quiet" onPress={() => void signOut()} />
      <Text style={type.small}>
        Photos are sent for one scan only and are not kept. Scan results are saved to your account so you can find them again.
      </Text>
    </ScrollView>
  );
}
