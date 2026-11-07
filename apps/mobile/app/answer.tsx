import { computeStats, computeVerdict, type SoldRow } from "@rs/core";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { api, type DataSource } from "../src/api";
import { useVerdictSettings } from "../src/settings";
import { colors, layout, radius, shadow, space, type, verdictTheme } from "../src/theme";
import {
  Button,
  Card,
  ChoiceChip,
  ErrorCard,
  FieldBox,
  type InputHandle,
  LedgerRow,
  NOT_AN_APPRAISAL,
  SamplePill,
  money,
  niceDate,
} from "../src/ui";

interface Loaded {
  words: string;
  rows: SoldRow[];
  lookbackDays: number;
  dataSource: DataSource;
  savedTag: number | null;
}

type ConditionFilter = "any" | "new" | "used";

export default function Answer() {
  const { scanId, words, saved } = useLocalSearchParams<{ scanId: string; words?: string; saved?: string }>();
  const { settings } = useVerdictSettings();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>("any");
  const [showList, setShowList] = useState<boolean | null>(null);
  const tagRef = useRef<InputHandle>(null);

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

  const pad = { paddingHorizontal: layout.screenPad };

  if (error) {
    return (
      <View style={[pad, { paddingTop: space.lg, gap: layout.cardGap }]}>
        <ErrorCard message={error} />
        <Button label="Try again" onPress={() => void load()} />
      </View>
    );
  }
  if (!data || !fullStats) {
    return (
      <View style={[pad, { paddingTop: space.lg }]}>
        <Card style={{ padding: space.xxl, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[type.body, { marginTop: space.lg }]}>Finding recorded sales...</Text>
        </Card>
      </View>
    );
  }

  const thin = stats.count < settings.minSales;
  const expanded = showList ?? data.rows.length <= 5;
  const callKey = verdict ? verdict.call : thin ? "not_enough_sales" : null;
  const vt = callKey ? verdictTheme[callKey] : null;
  const showFigures = !!verdict && verdict.call !== "not_enough_sales";

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[pad, { paddingTop: space.lg, paddingBottom: layout.sectionGap * 2, gap: layout.cardGap }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <SamplePill source={data.dataSource} />
      <Text style={type.itemName} numberOfLines={2}>
        {data.words}
      </Text>

      <Card style={{ padding: space.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.lg }}>
          <View>
            <Text style={type.cardLabel}>Median sold</Text>
            <Text style={type.medianFigure}>{money(stats.median)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[type.bodyStrong, { textAlign: "right" }]}>
              {money(stats.low)} to {money(stats.high)}
            </Text>
            <Text style={[type.small, { textAlign: "right" }]}>
              {stats.count} {stats.count === 1 ? "sale" : "sales"} in the last {data.lookbackDays} days. Most recent sale {niceDate(stats.mostRecentSale)}.
            </Text>
            {data.lookbackDays > 90 ? <Text style={[type.small, { textAlign: "right" }]}>Sales were thin, so the look back was widened.</Text> : null}
          </View>
        </View>
      </Card>

      {fullStats.wideSpread ? (
        <Card>
          <Text style={type.bodyStrong}>Prices vary a lot. What shape is it in?</Text>
          <Text style={[type.small, { marginTop: space.xs }]}>Condition usually explains a wide range. Narrow the sales to match your item.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md }}>
            <ChoiceChip label="Any" selected={condition === "any"} onPress={() => setCondition("any")} />
            <ChoiceChip label="New or sealed" selected={condition === "new"} onPress={() => setCondition("new")} />
            <ChoiceChip label="Used" selected={condition === "used"} onPress={() => setCondition("used")} />
          </View>
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Card>
          <Text style={type.cardLabel}>Price on the tag</Text>
          <View style={{ marginTop: space.sm }}>
            <FieldBox
              inputRef={tagRef}
              value={tag}
              onChangeText={setTag}
              keyboardType="decimal-pad"
              placeholder="0.00"
              prefix="$"
              prefixStyle={type.dollarSign}
              inputStyle={type.tagInput}
              height={layout.tagFieldHeight}
              filled={tag.trim() !== ""}
              accessibilityLabel="Price on the tag"
            />
          </View>
        </Card>

        {vt && callKey ? (
          <View style={[{ backgroundColor: vt.fill, borderRadius: radius.card, padding: layout.cardPad }, shadow.verdict]}>
            <Text style={[type.verdictWord, { color: vt.text }]}>{vt.label}</Text>
            <Text style={[type.body, { color: vt.text, marginTop: 6 }]}>
              {verdict
                ? verdict.explanation
                : `Only ${stats.count} recorded ${stats.count === 1 ? "sale" : "sales"} found. Too few to call it.`}
            </Text>
            {showFigures && verdict ? (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.lg, marginTop: space.lg }}>
                  <View style={{ flexGrow: 1, flexBasis: 120 }}>
                    <Text style={[type.cardLabel, { color: vt.soft }]}>You would keep</Text>
                    <Text style={[type.verdictFigure, { color: vt.text }]}>{money(verdict.expectedKeep)}</Text>
                  </View>
                  <View style={{ flexGrow: 1, flexBasis: 120 }}>
                    <Text style={[type.cardLabel, { color: vt.soft }]}>Profit</Text>
                    <Text style={[type.verdictFigure, { color: vt.text }]}>{money(verdict.expectedProfit)}</Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: vt.divider, marginTop: space.lg }} />
                <View style={{ marginTop: space.sm }}>
                  <LedgerRow tone={verdict.call} label="Median sold" value={money(verdict.medianSold)} />
                  <LedgerRow tone={verdict.call} label={`Selling fee (${settings.feePercent}%)`} value={`-${money(verdict.feeAmount)}`} />
                  <LedgerRow tone={verdict.call} label="Per order fee" value={`-${money(verdict.fixedFee)}`} />
                  <LedgerRow tone={verdict.call} label="Shipping estimate" value={`-${money(verdict.shipping)}`} />
                  <LedgerRow tone={verdict.call} bold label="You would keep" value={money(verdict.expectedKeep)} />
                  <LedgerRow tone={verdict.call} label="Tag price" value={`-${money(verdict.tagPrice)}`} />
                  <LedgerRow
                    tone={verdict.call}
                    bold
                    label="Profit"
                    value={money(verdict.expectedProfit)}
                    last={verdict.returnPercent === null}
                  />
                  {verdict.returnPercent !== null ? (
                    <LedgerRow tone={verdict.call} last label="Return on cost" value={`${Math.round(verdict.returnPercent)}%`} />
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Type the tag price"
            onPress={() => tagRef.current?.focus()}
            style={{
              backgroundColor: colors.field,
              borderRadius: radius.card,
              padding: layout.cardPad,
              borderWidth: 1,
              borderColor: colors.lineStrong,
              alignItems: "center",
            }}
          >
            <Text style={[type.bodyStrong, { textAlign: "center" }]}>Type the tag price to get the call</Text>
            <Text style={[type.small, { textAlign: "center", marginTop: space.xs }]}>The call counts fees and shipping, so the profit is real.</Text>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: layout.sectionGap - layout.cardGap }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
          <Text style={[type.cardLabel, { flex: 1 }]}>The sales behind this number ({rows.length})</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowList(!expanded)}
            style={{ minHeight: layout.minTouch, justifyContent: "center", paddingLeft: space.lg }}
          >
            <Text style={[type.bodyStrong, { color: colors.accent }]}>{expanded ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
        {expanded ? (
          <Card style={{ paddingVertical: space.xs }}>
            {rows.map((r, i) => (
              <View
                key={`${r.url ?? r.title}-${i}`}
                style={[
                  { paddingVertical: layout.rowPad },
                  i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.lg }}>
                  <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={[type.bodyStrong, { width: 88, textAlign: "right" }]}>{money(r.price)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs }}>
                  <Text style={type.small}>Sold {niceDate(r.soldDate)}</Text>
                  {r.condition ? (
                    <View style={{ backgroundColor: colors.field, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: space.sm }}>
                      <Text style={type.conditionChip}>{r.condition}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </View>

      <Text style={[type.caption, { marginTop: space.xs }]}>{NOT_AN_APPRAISAL}</Text>
    </ScrollView>
  );
}
