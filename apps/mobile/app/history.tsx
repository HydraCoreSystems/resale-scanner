import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { api, type ScanSummary } from "../src/api";
import { callPill, colors, layout, radius, space, type, type Call } from "../src/theme";
import { Button, Card, ErrorCard, Pill, SampleChip, StripeCard, money, niceDate } from "../src/ui";

export default function History() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .history()
        .then((r) => setScans(r.scans))
        .catch((e: Error) => setError(e.message));
    }, []),
  );

  const confirmDelete = (s: ScanSummary) =>
    Alert.alert("Delete this scan?", s.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void api.remove(s.id).then(() => setScans((cur) => (cur ?? []).filter((x) => x.id !== s.id)));
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={scans ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: layout.screenPad, paddingBottom: layout.sectionGap * 2 }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={error ? <ErrorCard message={error} style={{ marginBottom: space.md }} /> : undefined}
        ListEmptyComponent={
          scans ? (
            <Card style={{ padding: space.xxl, alignItems: "center" }}>
              <View style={{ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }}>
                <Text style={type.emptyBadge}>No scans</Text>
              </View>
              <Text style={[type.body, { textAlign: "center", marginTop: space.lg }]}>
                No scans yet. Your scans show up here so you can find them again at the register.
              </Text>
              <Button label="Scan an item" onPress={() => router.replace("/")} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
            </Card>
          ) : undefined
        }
        renderItem={({ item }) => {
          const key = item.call as Call | null;
          const pill = key ? callPill[key] : undefined;
          const priced = item.count !== null;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                priced
                  ? router.push({ pathname: "/answer", params: { scanId: item.id, saved: "1" } })
                  : router.push({ pathname: "/confirm", params: { scanId: item.id, solid: "1" } })
              }
              onLongPress={() => confirmDelete(item)}
            >
              <StripeCard stripe={pill ? pill.stripe : colors.lineSoft} padding={space.lg}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.md }}>
                  <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {pill ? <Pill label={pill.label} ground={pill.ground} textColor={pill.text} /> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginTop: 6 }}>
                  <SampleChip source={item.dataSource} />
                  <Text style={[type.small, { flex: 1 }]}>
                    {niceDate(item.createdAt)}
                    {priced ? (
                      <>
                        {" · median "}
                        <Text style={type.smallStrong}>{money(item.median)}</Text>
                        {` · ${item.count} sales`}
                      </>
                    ) : (
                      " · not priced yet"
                    )}
                    {item.tagPrice !== null ? (
                      <>
                        {" · tag "}
                        <Text style={type.smallStrong}>{money(item.tagPrice)}</Text>
                      </>
                    ) : null}
                  </Text>
                </View>
              </StripeCard>
            </Pressable>
          );
        }}
        ListFooterComponent={
          scans && scans.length > 0 ? <Text style={[type.caption, { textAlign: "center", marginTop: space.sm }]}>Press and hold a scan to delete it.</Text> : undefined
        }
      />
    </View>
  );
}
