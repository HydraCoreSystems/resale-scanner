import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../src/api";
import { PRODUCT_ANNUAL } from "../src/products";
import { purchases, type StoreProduct } from "../src/purchases";
import { useSession } from "../src/session";
import { colors, layout, radius, space, type } from "../src/theme";
import { Button, Card, CheckMark, ErrorCard } from "../src/ui";

const BENEFITS = [
  "Real sold prices, not asking prices.",
  "A clear call at the tag price, after fees and shipping.",
  "Your scan history, saved for the register.",
];

export default function Paywall() {
  const router = useRouter();
  const { entitlement, setEntitlement } = useSession();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void purchases.products().then(setProducts);
  }, []);

  const buy = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      const signed = await purchases.buy(id);
      const r = await api.purchase(signed);
      setEntitlement(r.entitlement);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The purchase did not go through.");
    } finally {
      setBusyId(null);
    }
  };

  const restore = async () => {
    setError(null);
    setBusyId("restore");
    try {
      const all = await purchases.restore();
      let last = entitlement;
      for (const s of all) last = (await api.purchase(s)).entitlement;
      if (last) setEntitlement(last);
      if (all.length === 0) setError("No earlier purchases found on this Apple ID.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore did not work.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: layout.screenPad, paddingBottom: layout.sectionGap * 2 }}>
      <Text style={type.screenTitle}>{entitlement && entitlement.totalRemaining === 0 ? "You are out of scans" : "Get more scans"}</Text>
      <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{entitlement?.totalRemaining ?? 0} scans left right now.</Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {BENEFITS.map((b) => (
          <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <CheckMark />
            <Text style={[type.body, { flex: 1 }]}>{b}</Text>
          </View>
        ))}
      </View>

      <ErrorCard message={error} style={{ marginTop: space.xxl }} />

      <View style={{ marginTop: space.xxl, gap: layout.cardGap }}>
        {products.map((p) => {
          const best = p.id === PRODUCT_ANNUAL;
          return (
            <Card key={p.id} style={best ? { borderColor: colors.accent, borderWidth: 2, padding: layout.cardPad - 1 } : undefined}>
              {best ? (
                <View
                  style={{
                    position: "absolute",
                    top: space.lg,
                    right: space.lg,
                    backgroundColor: colors.accent,
                    borderRadius: radius.pill,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={type.bestValue}>Best value</Text>
                </View>
              ) : null}
              <Text style={type.bodyStrong}>{p.title}</Text>
              <Text style={[type.priceFigure, { marginTop: 6 }]}>{p.priceText}</Text>
              <Text style={[type.small, { marginTop: 6 }]}>{p.detail}</Text>
              <Button label="Buy" onPress={() => void buy(p.id)} busy={busyId === p.id} disabled={busyId !== null} style={{ marginTop: space.lg }} />
            </Card>
          );
        })}
      </View>

      <Button label="Restore purchases" kind="quiet" onPress={() => void restore()} busy={busyId === "restore"} disabled={busyId !== null} style={{ marginTop: space.sm + 6 }} />

      <View style={{ marginTop: space.lg, gap: space.xs }}>
        <Text style={[type.caption, { lineHeight: 18 }]}>
          Subscriptions renew automatically each period until you cancel in your Apple ID settings, at least 24 hours before the period ends. Payment is charged to your Apple ID.
        </Text>
        <Text style={[type.caption, { lineHeight: 18 }]}>Scan packs are one time purchases and do not expire.</Text>
      </View>
    </ScrollView>
  );
}
