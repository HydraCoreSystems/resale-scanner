import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { api, type ScanSummary } from "../src/api";
import { colors, space, type } from "../src/theme";
import { ErrorNote, SampleBanner, money, niceDate } from "../src/ui";

const CALL_TEXT: Record<string, { label: string; color: string }> = {
  buy: { label: "Buy", color: colors.buy },
  close_call: { label: "Close call", color: colors.close },
  pass: { label: "Pass", color: colors.pass },
  not_enough_sales: { label: "Not enough sales", color: colors.neutral },
};

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
    <View style={{ flex: 1, padding: space.md }}>
      <ErrorNote message={error} />
      <FlatList
        data={scans ?? []}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={scans ? <Text style={type.body}>No scans yet. Your scans show up here so you can find them again at the register.</Text> : undefined}
        renderItem={({ item }) => {
          const call = item.call ? CALL_TEXT[item.call] : undefined;
          const priced = item.count !== null;
          return (
            <Pressable
              onPress={() =>
                priced
                  ? router.push({ pathname: "/answer", params: { scanId: item.id, saved: "1" } })
                  : router.push({ pathname: "/confirm", params: { scanId: item.id, solid: "1" } })
              }
              onLongPress={() => confirmDelete(item)}
              style={{ paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 2 }}
            >
              <SampleBanner source={item.dataSource} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                <Text style={[type.body, { flex: 1, fontWeight: "700" }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {call ? <Text style={{ fontWeight: "800", color: call.color }}>{call.label}</Text> : null}
              </View>
              <Text style={type.small}>
                {niceDate(item.createdAt)}
                {priced ? ` · median ${money(item.median)} · ${item.count} sales` : " · not priced yet"}
                {item.tagPrice !== null ? ` · tag ${money(item.tagPrice)}` : ""}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={scans && scans.length > 0 ? <Text style={[type.small, { marginTop: space.md }]}>Press and hold a scan to delete it.</Text> : undefined}
      />
    </View>
  );
}
