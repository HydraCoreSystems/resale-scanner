import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "./session";
import { colors, space, type } from "./theme";
import { Button, ErrorNote } from "./ui";

export default function SignIn() {
  const { signIn } = useSession();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page, padding: space.lg, justifyContent: "center" }}>
      <View style={{ gap: space.md }}>
        <Text style={type.big}>Resale Scanner</Text>
        <Text style={type.body}>Photograph or scan an item. See what it actually sold for, and whether the tag price leaves you a profit.</Text>
        <Text style={type.small}>Your first 5 scans are free. No card needed.</Text>
        <ErrorNote message={error} />
        {appleOk ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={{ height: 56 }}
            onPress={withApple}
          />
        ) : null}
        {__DEV__ ? <Button label="Dev sign in (test builds only)" kind="quiet" onPress={dev} busy={busy} /> : null}
      </View>
    </SafeAreaView>
  );
}
