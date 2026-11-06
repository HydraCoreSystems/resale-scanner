import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../src/api";
import { purchases, type StoreProduct } from "../src/purchases";
import { useSession } from "../src/session";
import { space, type } from "../src/theme";
import { Button, Card, ErrorNote } from "../src/ui";

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
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Text style={type.title}>{entitlement && entitlement.totalRemaining === 0 ? "You are out of scans" : "Get more scans"}</Text>
      <Text style={type.body}>{entitlement?.totalRemaining ?? 0} scans left right now.</Text>
      <ErrorNote message={error} />
      {products.map((p) => (
        <Card key={p.id}>
          <Text style={[type.body, { fontWeight: "800" }]}>{p.title}</Text>
          <Text style={type.title}>{p.priceText}</Text>
          <Text style={[type.small, { marginVertical: space.sm }]}>{p.detail}</Text>
          <Button label="Buy" onPress={() => void buy(p.id)} busy={busyId === p.id} disabled={busyId !== null} />
        </Card>
      ))}
      <Button label="Restore purchases" kind="quiet" onPress={() => void restore()} busy={busyId === "restore"} disabled={busyId !== null} />
      <View style={{ gap: space.xs }}>
        <Text style={type.small}>
          Subscriptions renew automatically each period until you cancel in your Apple ID settings, at least 24 hours before the period ends. Payment is charged to your Apple ID.
        </Text>
        <Text style={type.small}>Scan packs are one time purchases and do not expire.</Text>
      </View>
    </ScrollView>
  );
}
