import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { colors, space, type } from "../src/theme";
import { Button, Card, ErrorNote } from "../src/ui";

/** Nothing is priced until the shopper confirms the name here. */
export default function Confirm() {
  const router = useRouter();
  const { scanId, solid } = useLocalSearchParams<{ scanId: string; solid?: string }>();
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [words, setWords] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .scan(scanId)
      .then((s) => {
        setCandidates(s.candidates);
        setWords(s.candidates[0] ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [scanId]);

  const nothing = solid === "0" || (candidates !== null && candidates.length === 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
      <ErrorNote message={error} />
      {nothing ? (
        <Card>
          <Text style={type.title}>No solid match</Text>
          <Text style={[type.body, { marginTop: space.sm }]}>
            I could not find a name I trust for this item. Type the words you would put in a listing, like brand, name and model number.
          </Text>
        </Card>
      ) : (
        <Text style={type.body}>Tap the one that matches, or fix the words below.</Text>
      )}

      {(candidates ?? []).map((c, i) => {
        const on = words === c;
        return (
          <Pressable key={c} onPress={() => setWords(c)}>
            <Card style={on ? { borderColor: colors.accent, borderWidth: 2 } : undefined}>
              <Text style={type.small}>{i === 0 ? "Best guess" : "Another possibility"}</Text>
              <Text style={[type.body, { fontWeight: "700", marginTop: 4 }]}>{c}</Text>
            </Card>
          </Pressable>
        );
      })}

      <View style={{ gap: space.sm }}>
        <Text style={type.small}>Words used to find sold prices</Text>
        <TextInput
          value={words}
          onChangeText={setWords}
          multiline
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 14,
            fontSize: 17,
            color: colors.text,
            minHeight: 64,
          }}
        />
        <Text style={type.small}>Include the model number if there is one. It keeps other products out of the numbers.</Text>
      </View>

      <Button
        label="Show what it sold for"
        disabled={words.trim().length < 3}
        onPress={() => router.replace({ pathname: "/answer", params: { scanId, words: words.trim() } })}
      />
    </ScrollView>
  );
}
