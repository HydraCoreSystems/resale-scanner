import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api } from "../src/api";
import { useSession } from "../src/session";
import { colors, space, type } from "../src/theme";
import { Button, ErrorNote, SampleBanner } from "../src/ui";

const MAX_BYTES = 480 * 1024; // the photo match service takes 500 KB at most

async function shrinkToLimit(uri: string): Promise<string> {
  const attempts: { width: number; compress: number }[] = [
    { width: 1000, compress: 0.6 },
    { width: 900, compress: 0.45 },
    { width: 800, compress: 0.35 },
    { width: 640, compress: 0.3 },
  ];
  for (const a of attempts) {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: a.width } }], {
      compress: a.compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    const b64 = out.base64 ?? "";
    if (b64.length * 0.75 <= MAX_BYTES) return b64;
  }
  throw new Error("Could not make the photo small enough. Try again closer to the item.");
}

export default function ScanScreen() {
  const router = useRouter();
  const { entitlement, setEntitlement, dataSources } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"photo" | "barcode">("photo");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const camera = useRef<CameraView>(null);
  const lastCode = useRef<string>("");

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 402) {
        router.push("/paywall");
        return;
      }
      setNotice(e instanceof Error ? e.message : "Something went wrong. Try again.");
    },
    [router],
  );

  const goConfirm = (scanId: string, solid: boolean) => router.push({ pathname: "/confirm", params: { scanId, solid: solid ? "1" : "0" } });

  const takePhoto = async () => {
    if (busy || !camera.current) return;
    setBusy(true);
    setNotice(null);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!shot?.uri) throw new Error("The camera did not return a photo.");
      const b64 = await shrinkToLimit(shot.uri);
      const r = await api.scanPhoto(b64, "image/jpeg");
      setEntitlement(r.entitlement);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goConfirm(r.scanId, !r.nothingSolid);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const onCode = async (data: string) => {
    if (busy || data === lastCode.current) return;
    lastCode.current = data;
    setBusy(true);
    setNotice(null);
    try {
      const r = await api.scanBarcode(data);
      setEntitlement(r.entitlement);
      if (!r.found) {
        setNotice(r.message);
        lastCode.current = "";
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goConfirm(r.scanId, true);
    } catch (e) {
      lastCode.current = "";
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const lookUpTyped = async () => {
    if (typed.trim().length < 3) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await api.scanText(typed.trim());
      setEntitlement(r.entitlement);
      goConfirm(r.scanId, true);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.page }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page, padding: space.lg, justifyContent: "center", gap: space.md }}>
        <Text style={type.title}>Camera access</Text>
        <Text style={type.body}>The camera reads barcodes and takes the photo that names an item. Photos are not kept after the scan.</Text>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
        <Button label="Type the item instead" kind="quiet" onPress={() => setTyping(true)} />
        {typing ? <TypedBox typed={typed} setTyped={setTyped} onGo={lookUpTyped} busy={busy} /> : null}
        <ErrorNote message={notice} />
      </SafeAreaView>
    );
  }

  const left = entitlement?.totalRemaining;
  return (
    <View style={{ flex: 1, backgroundColor: "#1d1a15" }}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={mode === "barcode" ? (e) => void onCode(e.data) : undefined}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ padding: space.md, gap: space.sm }}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.push("/history")} hitSlop={12}>
              <Text style={styles.topLink}>History</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/paywall")} hitSlop={12}>
              <Text style={styles.topLink}>{left === undefined ? "" : `${left} ${left === 1 ? "scan" : "scans"} left`}</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
              <Text style={styles.topLink}>Settings</Text>
            </Pressable>
          </View>
          <SampleBanner source={dataSources && Object.values(dataSources).includes("mock") ? "mock" : "real"} />
          <ErrorNote message={notice} />
        </View>

        <View style={{ padding: space.md, gap: space.md }}>
          {typing ? (
            <View style={styles.sheet}>
              <TypedBox typed={typed} setTyped={setTyped} onGo={lookUpTyped} busy={busy} />
            </View>
          ) : null}
          <View style={styles.modeRow}>
            {(["photo", "barcode"] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeChip, mode === m && styles.modeChipOn]}>
                <Text style={[styles.modeText, mode === m && { color: colors.accentText }]}>{m === "photo" ? "Photo" : "Barcode"}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setTyping((t) => !t)} style={[styles.modeChip, typing && styles.modeChipOn]}>
              <Text style={[styles.modeText, typing && { color: colors.accentText }]}>Type</Text>
            </Pressable>
          </View>
          {mode === "photo" ? (
            <Pressable accessibilityLabel="Take photo" onPress={takePhoto} disabled={busy} style={[styles.shutter, busy && { opacity: 0.5 }]}>
              <View style={styles.shutterInner} />
            </Pressable>
          ) : (
            <Text style={styles.hint}>{busy ? "Looking up..." : "Point at the barcode. It scans on its own."}</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function TypedBox({ typed, setTyped, onGo, busy }: { typed: string; setTyped: (s: string) => void; onGo: () => void; busy: boolean }) {
  return (
    <View style={{ gap: space.sm }}>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder="Brand, name, model number"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onGo}
      />
      <Button label="Look it up" onPress={onGo} busy={busy} disabled={typed.trim().length < 3} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(241,232,216,0.92)", borderRadius: 12, padding: space.sm + 4 },
  topLink: { fontSize: 16, fontWeight: "700", color: colors.text },
  sheet: { backgroundColor: colors.page, borderRadius: 16, padding: space.md },
  input: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 17, color: colors.text },
  modeRow: { flexDirection: "row", justifyContent: "center", gap: space.sm },
  modeChip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "rgba(241,232,216,0.92)" },
  modeChipOn: { backgroundColor: colors.accent },
  modeText: { fontSize: 16, fontWeight: "700", color: colors.text },
  shutter: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: colors.page, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.page },
  hint: { textAlign: "center", color: colors.page, fontSize: 16, fontWeight: "600", paddingVertical: 24 },
});
