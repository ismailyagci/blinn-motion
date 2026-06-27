import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FottieView, type FottieHandle } from "@fottie/react-native";
import type { MotionDoc } from "@fottie/core";
import doc from "../../fixtures/card.motion.json";

const motionDoc = doc as MotionDoc;

export default function App() {
  const ref = useRef<FottieHandle>(null);
  const [playing, setPlaying] = useState(true);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>Fottie · React Native</Text>
      <Text style={styles.sub}>
        The same MotionDoc, rendered to native Views by @fottie/react-native —
        driven by @fottie/core's render method.
      </Text>

      <View style={styles.stageWrap}>
        <FottieView ref={ref} doc={motionDoc} loop autoplay />
      </View>

      <View style={styles.controls}>
        <Pressable
          style={styles.btn}
          onPress={() => {
            ref.current?.toggle();
            setPlaying((p) => !p);
          }}
        >
          <Text style={styles.btnText}>{playing ? "❚❚ Pause" : "▶ Play"}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.ghost]}
          onPress={() => {
            ref.current?.seek(0);
            ref.current?.play();
            setPlaying(true);
          }}
        >
          <Text style={styles.btnText}>↺ Restart</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0d12", padding: 24, gap: 12 },
  title: { color: "#e7eaf0", fontSize: 22, fontWeight: "700" },
  sub: { color: "#8b93a7", fontSize: 13, marginBottom: 12 },
  stageWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  controls: { flexDirection: "row", gap: 12, justifyContent: "center" },
  btn: { backgroundColor: "#2d6cff", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  ghost: { backgroundColor: "#1e2430" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
