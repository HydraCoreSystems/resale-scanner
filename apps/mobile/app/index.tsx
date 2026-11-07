import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api } from "../src/api";
import { useSession } from "../src/session";
import { colors, layout, opacity, radius, space, type } from "../src/theme";
import { Button, Card, ErrorCard, FieldBox, SamplePill } from "../src/ui";

const MAX_BYTES = 480 * 1024; // the photo match service takes 500 KB at most
const CORNER_ARM = 26;
const CORNER_THICK = 4;

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

/** Four corner marks and a label. Never blocks touches. */
function FramingGuide({ mode }: { mode: "photo" | "barcode" }) {
  const { width } = useWindowDimensions();
  const w = mode === "photo" ? width * 0.8 : width * 0.84;
  const h = mode === "photo" ? w * 0.62 : 120;
  const corner = { position: "absolute" as const, width: CORNER_ARM, height: CORNER_ARM, borderColor: colors.scrimText };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
      <View style={{ width: w, height: h }}>
        <View style={[corner, { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: radius.guide }]} />
        <View style={[corner, { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: radius.guide }]} />
        <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: radius.guide }]} />
        <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: radius.guide }]} />
        {mode === "barcode" ? (
          <View style={{ position: "absolute", left: 0, right: 0, top: h / 2 - 1, height: 2, backgroundColor: colors.goldLine }} />
        ) : null}
      </View>
      <View style={styles.guideLabel}>
        <Text style={type.chromeLabel}>{mode === "photo" ? "Center the item" : "Fit the barcode in the frame"}</Text>
      </View>
    </View>
  );
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

  const sampleSource = dataSources && Object.values(dataSources).includes("mock") ? "mock" : "real";

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.page }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page, padding: layout.screenPad, justifyContent: "center", gap: layout.cardGap }}>
        <Text style={type.screenTitle}>Camera access</Text>
        <Text style={type.body}>The camera reads barcodes and takes the photo that names an item. Photos are not kept after the scan.</Text>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
        <Button label="Type the item instead" kind="quiet" onPress={() => setTyping(true)} />
        {typing ? (
          <Card>
            <TypedBox typed={typed} setTyped={setTyped} onGo={lookUpTyped} busy={busy} />
          </Card>
        ) : null}
        <ErrorCard message={notice} />
      </SafeAreaView>
    );
  }

  const left = entitlement?.totalRemaining;
  return (
    <View style={{ flex: 1, backgroundColor: colors.cameraGround }}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={mode === "barcode" ? (e) => void onCode(e.data) : undefined}
      />
      {!typing ? <FramingGuide mode={mode} /> : null}
      <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }} pointerEvents="box-none">
        <View style={{ margin: space.lg }} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="History" onPress={() => router.push("/history")} style={styles.topLinkBox}>
              <Text style={type.chromeLink}>History</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Scans left" onPress={() => router.push("/paywall")} hitSlop={8}>
              <View style={styles.countPill}>
                <Text style={type.chromePill}>{left === undefined ? "Scans" : `${left} ${left === 1 ? "scan" : "scans"} left`}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={[styles.topLinkBox, { alignItems: "flex-end" }]}>
              <Text style={type.chromeLink}>Settings</Text>
            </Pressable>
          </View>
          <SamplePill source={sampleSource} style={{ marginTop: space.md }} />
          <ErrorCard message={notice} compact style={{ marginTop: space.md }} />
        </View>

        <View style={{ paddingHorizontal: layout.screenPad, paddingBottom: space.lg, gap: space.lg }} pointerEvents="box-none">
          {typing ? (
            <Card style={{ borderRadius: radius.sheetTop }}>
              <TypedBox typed={typed} setTyped={setTyped} onGo={lookUpTyped} busy={busy} />
            </Card>
          ) : null}

          {!typing && mode === "photo" ? (
            <View style={{ alignItems: "center" }}>
              <Pressable
                accessibilityLabel="Take photo"
                accessibilityRole="button"
                onPress={takePhoto}
                disabled={busy}
                style={[styles.shutter, busy && { opacity: opacity.disabled }]}
              >
                <View style={styles.shutterInner} />
              </Pressable>
              <Text style={[type.shutterWord, { marginTop: space.sm }]}>Scan</Text>
            </View>
          ) : null}
          {!typing && mode === "barcode" && busy ? (
            <View style={{ alignItems: "center" }}>
              <View style={styles.lookingUp}>
                <Text style={type.lookingUp}>Looking up</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.segmented}>
            {(["photo", "barcode", "type"] as const).map((m) => {
              const on = m === "type" ? typing : !typing && mode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    if (m === "type") setTyping(true);
                    else {
                      setTyping(false);
                      setMode(m);
                    }
                  }}
                  style={[styles.segment, on && { backgroundColor: colors.accent }]}
                >
                  <Text style={on ? type.segmentOn : type.segment}>{m === "photo" ? "Photo" : m === "barcode" ? "Barcode" : "Type"}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function TypedBox({ typed, setTyped, onGo, busy }: { typed: string; setTyped: (s: string) => void; onGo: () => void; busy: boolean }) {
  return (
    <View style={{ gap: space.md }}>
      <FieldBox
        value={typed}
        onChangeText={setTyped}
        placeholder="Brand, name, model number"
        height={56}
        inputStyle={type.body}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onGo}
        accessibilityLabel="Item words"
      />
      <Button label="Look it up" onPress={onGo} busy={busy} disabled={typed.trim().length < 3} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.barGround,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: space.lg,
  },
  topLinkBox: { minHeight: layout.minTouch, minWidth: 72, justifyContent: "center" },
  countPill: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md },
  guideLabel: { backgroundColor: colors.chipGround, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md, marginTop: space.lg },
  segmented: { flexDirection: "row", backgroundColor: colors.chipGround, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, height: layout.minTouch, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  shutter: { width: 84, height: 84, borderRadius: radius.pill, borderWidth: 4, borderColor: colors.scrimText, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.scrimText },
  lookingUp: { backgroundColor: colors.chipGround, borderRadius: radius.pill, paddingVertical: space.md, paddingHorizontal: space.xl },
});
