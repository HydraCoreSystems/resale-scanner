import { computeStats, computeVerdict, type SoldRow, type VerdictCall } from "@rs/core";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type DataSource } from "../src/api";
import { useVerdictSettings } from "../src/settings";
import { colors, space, type } from "../src/theme";
import { Button, Card, ErrorNote, NOT_AN_APPRAISAL, Row, SampleBanner, money, niceDate } from "../src/ui";

interface Loaded {
  words: string;
  rows: SoldRow[];
  lookbackDays: number;
  dataSource: DataSource;
  savedTag: number | null;
}

type ConditionFilter = "any" | "new" | "used";

const CALL_LABEL: Record<VerdictCall, string> = {
  buy: "BUY",
  close_call: "CLOSE CALL",
  pass: "PASS",
  not_enough_sales: "NOT ENOUGH SALES",
};
const CALL_COLOR: Record<VerdictCall, string> = {
  buy: colors.buy,
  close_call: colors.close,
  pass: colors.pass,
  not_enough_sales: colors.neutral,
};

export default function Answer() {
  const { scanId, words, saved } = useLocalSearchParams<{ scanId: string; words?: string; saved?: string }>();
  const { settings } = useVerdictSettings();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>("any");
  const [showList, setShowList] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      if (saved === "1") {
        const s = await api.scan(scanId);
        setData({
          words: s.name,
          rows: s.listings,
          lookbackDays: s.lookbackDays ?? 90,
          dataSource: s.dataSource,
          savedTag: s.tagPrice,
        });
        if (s.tagPrice !== null) setTag(String(s.tagPrice));
      } else {
        const r = await api.price(scanId, words ?? "");
        setData({ words: r.words, rows: r.listings, lookbackDays: r.lookbackDays, dataSource: r.dataSource, savedTag: null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
  }, [scanId, words, saved]);

  useEffect(() => {
    void load();
  }, [load]);

  const fullStats = useMemo(() => (data ? computeStats(data.rows) : null), [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (condition === "any") return data.rows;
    const isNew = (r: SoldRow) => /\bnew\b|sealed|unopened/i.test(r.condition ?? "");
    return data.rows.filter((r) => (condition === "new" ? isNew(r) : !isNew(r)));
  }, [data, condition]);

  const stats = useMemo(() => computeStats(rows), [rows]);
  const tagNum = Number(tag.replace(/[^0-9.]/g, ""));
  const hasTag = tag.trim() !== "" && Number.isFinite(tagNum);
  const verdict = useMemo(() => (hasTag ? computeVerdict(stats, tagNum, settings) : null), [stats, tagNum, hasTag, settings]);

  // Save the tag and the call to history once the shopper stops typing.
  useEffect(() => {
    if (!verdict || !hasTag) return;
    const t = setTimeout(() => {
      void api.saveCall(scanId, tagNum, verdict.call).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [verdict, hasTag, tagNum, scanId]);

  if (error) {
    return (
      <View style={{ padding: space.md, gap: space.md }}>
        <ErrorNote message={error} />
        <Button label="Try again" onPress={() => void load()} />
      </View>
    );
  }
  if (!data || !fullStats) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={type.body}>Finding recorded sales...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl * 2 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <SampleBanner source={data.dataSource} />
      <Text style={type.title}>{data.words}</Text>

      <Card>
        <Text style={type.small}>Median sold price</Text>
        <Text style={type.big}>{money(stats.median)}</Text>
        <Text style={[type.body, { marginTop: space.sm }]}>
          Middle range {money(stats.low)} to {money(stats.high)}
        </Text>
        <Text style={[type.small, { marginTop: space.xs }]}>
          {stats.count} {stats.count === 1 ? "sale" : "sales"} in the last {data.lookbackDays} days. Most recent sale {niceDate(stats.mostRecentSale)}.
        </Text>
        {data.lookbackDays > 90 ? <Text style={type.small}>Sales were thin, so the look back was widened.</Text> : null}
      </Card>

      {fullStats.wideSpread ? (
        <Card>
          <Text style={[type.body, { fontWeight: "700" }]}>Prices vary a lot. What shape is it in?</Text>
          <Text style={[type.small, { marginTop: 4 }]}>Condition usually explains a wide range. Narrow the sales to match your item.</Text>
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
            {(["any", "new", "used"] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCondition(c)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 999,
                  backgroundColor: condition === c ? colors.accent : colors.page,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ fontWeight: "700", color: condition === c ? colors.accentText : colors.text }}>
                  {c === "any" ? "Any" : c === "new" ? "New or sealed" : "Used"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={type.small}>Price on the tag</Text>
        <TextInput
          value={tag}
          onChangeText={setTag}
          keyboardType="decimal-pad"
          placeholder="$0.00"
          placeholderTextColor={colors.muted}
          style={{ fontSize: 34, fontWeight: "800", color: colors.text, paddingVertical: 6 }}
        />
      </Card>

      {verdict ? (
        <Card style={{ borderColor: CALL_COLOR[verdict.call], borderWidth: 3 }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: CALL_COLOR[verdict.call] }}>{CALL_LABEL[verdict.call]}</Text>
          <Text style={[type.body, { marginTop: space.xs }]}>{verdict.explanation}</Text>
          {verdict.call !== "not_enough_sales" ? (
            <View style={{ marginTop: space.md }}>
              <Row label="Median sold" value={money(verdict.medianSold)} />
              <Row label={`Selling fee (${settings.feePercent}%)`} value={`-${money(verdict.feeAmount)}`} />
              <Row label="Per order fee" value={`-${money(verdict.fixedFee)}`} />
              <Row label="Shipping estimate" value={`-${money(verdict.shipping)}`} />
              <Row label="You would keep" value={money(verdict.expectedKeep)} bold />
              <Row label="Tag price" value={`-${money(verdict.tagPrice)}`} />
              <Row label="Profit" value={money(verdict.expectedProfit)} bold />
              {verdict.returnPercent !== null ? <Row label="Return on cost" value={`${Math.round(verdict.returnPercent)}%`} /> : null}
            </View>
          ) : null}
        </Card>
      ) : stats.count < settings.minSales ? (
        <Card>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.neutral }}>NOT ENOUGH SALES</Text>
          <Text style={[type.body, { marginTop: 4 }]}>Only {stats.count} recorded {stats.count === 1 ? "sale" : "sales"} found. Too few to call it.</Text>
        </Card>
      ) : (
        <Text style={type.small}>Type the tag price to get the call.</Text>
      )}

      <Pressable onPress={() => setShowList((s) => !s)}>
        <Text style={[type.body, { fontWeight: "700" }]}>{showList ? "Hide" : "Show"} the {rows.length} sales behind this number</Text>
      </Pressable>
      {showList
        ? rows.map((r, i) => (
            <View key={`${r.url ?? r.title}-${i}`} style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
                <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>
                  {r.title}
                </Text>
                <Text style={[type.body, { fontWeight: "800" }]}>{money(r.price)}</Text>
              </View>
              <Text style={type.small}>
                Sold {niceDate(r.soldDate)}
                {r.condition ? ` · ${r.condition}` : ""}
              </Text>
            </View>
          ))
        : null}

      <Text style={type.small}>{NOT_AN_APPRAISAL}</Text>
    </ScrollView>
  );
}
