import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../src/session";
import { colors } from "../src/theme";
import SignIn from "../src/SignIn";

function Gate() {
  const { ready, signedIn } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.page, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!signedIn) return <SignIn />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Scan", headerShown: false }} />
      <Stack.Screen name="confirm" options={{ title: "Is this it?" }} />
      <Stack.Screen name="answer" options={{ title: "Sold prices" }} />
      <Stack.Screen name="history" options={{ title: "Scan history" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="paywall" options={{ title: "Get more scans", presentation: "modal" }} />
    </Stack>
  );
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
