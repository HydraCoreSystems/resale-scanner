import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type DataSource } from "../src/api";
import { colors, layout, radius, space, type } from "../src/theme";
import { Button, Card, ErrorCard, SamplePill, SectionLabel, StripeCard, WordsField } from "../src/ui";

const BAR_CONTENT_HEIGHT = 56 + 24;

function Radio({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: radius.pill,
        borderWidth: 2,
        borderColor: on ? colors.accent : colors.lineStrong,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? <View style={{ width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.accent }} /> : null}
    </View>
  );
}

/** Nothing is priced until the shopper confirms the name here. */
export default function Confirm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scanId, solid } = useLocalSearchParams<{ scanId: string; solid?: string }>();
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [source, setSource] = useState<DataSource | undefined>(undefined);
  const [words, setWords] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .scan(scanId)
      .then((s) => {
        setCandidates(s.candidates);
        setSource(s.dataSource);
        setWords(s.candidates[0] ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [scanId]);

  const nothing = solid === "0" || (candidates !== null && candidates.length === 0);
  const barHeight = BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: layout.screenPad, paddingTop: space.lg, paddingBottom: barHeight + space.lg, gap: layout.cardGap }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View>
          <Text style={type.cardLabel}>Step 1 of 2</Text>
          <Text style={[type.screenTitle, { marginTop: space.sm }]}>Name the item</Text>
        </View>
        <SamplePill source={source} />
        <ErrorCard message={error} />

        {nothing ? (
          <StripeCard stripe={colors.errorGround}>
            <Text style={type.itemName}>No solid match</Text>
            <Text style={[type.body, { marginTop: space.sm }]}>
              I could not find a name I trust for this item. Type the words you would put in a listing, like brand, name and model number.
            </Text>
          </StripeCard>
        ) : (
          <Text style={type.body}>Tap the one that matches, or fix the words below.</Text>
        )}

        <View style={{ gap: space.md }}>
          {(candidates ?? []).map((c, i) => {
            const on = words === c;
            return (
              <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setWords(c)}>
                <Card
                  style={[
                    { flexDirection: "row", alignItems: "center", gap: space.lg },
                    on && { backgroundColor: colors.accentTint, borderColor: colors.accent, borderWidth: 2, padding: layout.cardPad - 1 },
                  ]}
                >
                  <Radio on={on} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.cardLabel}>{i === 0 ? "Best guess" : "Another possibility"}</Text>
                    <Text style={[type.bodyStrong, { marginTop: space.xs }]}>{c}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <View>
          <SectionLabel>Words used to find sold prices</SectionLabel>
          <WordsField value={words} onChangeText={setWords} accessibilityLabel="Words used to find sold prices" />
          <Text style={[type.small, { marginTop: space.sm }]}>Include the model number if there is one. It keeps other products out of the numbers.</Text>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.page,
          borderTopWidth: 1,
          borderTopColor: colors.lineSoft,
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.md + insets.bottom,
        }}
      >
        <Button
          label="Show what it sold for"
          disabled={words.trim().length < 3}
          onPress={() => router.replace({ pathname: "/answer", params: { scanId, words: words.trim() } })}
        />
      </View>
    </View>
  );
}
