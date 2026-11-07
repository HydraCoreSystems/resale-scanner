import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "./session";
import { colors, radius, shadow, space, type } from "./theme";
import { Button, Card, ErrorCard } from "./ui";

const STEPS: { lead: string; rest: string }[] = [
  { lead: "Name the item.", rest: "A photo, a barcode, or typed words." },
  { lead: "See real sold prices.", rest: "The median and the range, from recorded sales." },
  { lead: "Get the call.", rest: "Buy, Close call, or Pass at the tag price, after fees and shipping." },
];

export default function SignIn() {
  const { signIn } = useSession();
  const { height } = useWindowDimensions();
  const [appleOk, setAppleOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleOk);
  }, []);

  const withApple = async () => {
    setError(null);
    setBusy(true);
    try {
      // No name or email requested. The account is keyed on Apple's private id only.
      const cred = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      if (!cred.identityToken) throw new Error("Apple did not return a sign in token.");
      await signIn(cred.identityToken);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "ERR_REQUEST_CANCELED") setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const dev = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn("dev:phil");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: height * 0.12 - 40 > 0 ? height * 0.12 - 40 : 12 }}>
        <View
          style={[
            { width: 60, height: 60, borderRadius: radius.tile, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
            shadow.card,
          ]}
        >
          <Text style={type.tileLetters}>RS</Text>
        </View>
        <Text style={[type.wordmark, { marginTop: space.lg }]}>Resale Scanner</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.md }]}>
          Photograph or scan an item. See what it actually sold for, and whether the tag price leaves you a profit.
        </Text>
        <View style={{ alignSelf: "flex-start", marginTop: space.lg, backgroundColor: colors.freePill, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 }}>
          <Text style={type.freePillText}>Your first 5 scans are free. No card needed.</Text>
        </View>

        <Card style={{ marginTop: 28, gap: 14 }}>
          {STEPS.map((s, i) => (
            <View key={s.lead} style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
              <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }}>
                <Text style={type.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={[type.body, { flex: 1, paddingTop: 2 }]}>
                <Text style={type.bodyStrong}>{s.lead}</Text> {s.rest}
              </Text>
            </View>
          ))}
        </Card>

        <ErrorCard message={error} style={{ marginTop: 28 }} />
        <View style={{ marginTop: 28, gap: space.md }}>
          {appleOk ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.button}
              style={{ height: 56 }}
              onPress={withApple}
            />
          ) : null}
          {__DEV__ ? <Button label="Dev sign in (test builds only)" kind="quiet" onPress={dev} busy={busy} /> : null}
        </View>

        <View style={{ flex: 1, minHeight: space.xxl }} />
        <Text style={[type.caption, { textAlign: "center", marginBottom: space.xxl }]}>
          Photos are sent for one scan only and are not kept. Scan results are saved to your account so you can find them again.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
