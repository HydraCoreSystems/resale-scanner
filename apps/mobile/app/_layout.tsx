import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import type { NativeStackHeaderProps } from "expo-router";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import SignIn from "../src/SignIn";
import { SessionProvider, useSession } from "../src/session";
import { colors, layout, type } from "../src/theme";

/** Header with a one point bottom border so it reads as a finished element against scrolling content. */
function AppHeader({ navigation, options, back, route }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title = typeof options.title === "string" ? options.title : route.name;
  const closeLabel = route.name === "paywall" ? "Close" : "Back";
  return (
    <View style={{ backgroundColor: colors.page, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
      <View style={{ height: 52, justifyContent: "center", paddingHorizontal: layout.screenPad - 8 }}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={navigation.goBack}
            hitSlop={8}
            style={{ position: "absolute", left: layout.screenPad - 8, minHeight: layout.minTouch, minWidth: layout.minTouch, justifyContent: "center", paddingHorizontal: 8 }}
          >
            <Text style={[type.headerTitle, { color: colors.accent }]}>{route.name === "paywall" ? "Close" : "‹ Back"}</Text>
          </Pressable>
        ) : null}
        <Text style={[type.headerTitle, { textAlign: "center" }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

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
    <Stack screenOptions={{ header: (p) => <AppHeader {...p} />, contentStyle: { backgroundColor: colors.page } }}>
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
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  // If the font files fail to load, show the app anyway rather than a blank screen.
  const fontsReady = fontsLoaded || fontError !== null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsReady ? (
        <SessionProvider>
          <Gate />
        </SessionProvider>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.page }} />
      )}
    </SafeAreaProvider>
  );
}
