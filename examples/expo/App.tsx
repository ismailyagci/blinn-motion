import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { BlinnMotionView, type BlinnMotionHandle } from "@blinn-motion/react-native";
import type { MotionDoc } from "@blinn-motion/core";
import card from "../../fixtures/card.motion.json";
import showcase from "../../fixtures/showcase.motion.json";

type FixtureId = "card" | "showcase";
const fixtures: Record<FixtureId, MotionDoc> = {
  card: card as MotionDoc,
  showcase: showcase as MotionDoc,
};

/**
 * Expo advanced demo — uses @blinn-motion/react-native (no Canvas dual-stage on RN).
 * Same transport/progress cases as web examples.
 */
export default function App() {
  const ref = useRef<BlinnMotionHandle>(null);
  const [docId, setDocId] = useState<FixtureId>("showcase");
  const [mode, setMode] = useState<"clock" | "progress">("clock");
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [timeLabel, setTimeLabel] = useState("0.00s");
  const [fracLabel, setFracLabel] = useState("0%");
  const [scrub, setScrub] = useState(0);

  const doc = fixtures[docId];
  const progressProp = mode === "progress" ? progress : undefined;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.badge}>Expo · @blinn-motion/react-native</Text>
        <Text style={styles.title}>Blinn Motion · Expo advanced demo</Text>
        <Text style={styles.lede}>
          Native Views via the React Native adapter. Full transport + progress-driven mode.
          (No dual Canvas stage — RN adapter paints Views only.)
        </Text>

        <View style={styles.stageWrap}>
          <BlinnMotionView
            ref={ref}
            doc={doc}
            loop
            autoplay={mode === "clock"}
            rate={rate}
            progress={progressProp}
            onFrame={(t, f) => {
              setTimeLabel(`${t.toFixed(2)}s`);
              setFracLabel(`${Math.round(f * 100)}%`);
              if (mode === "clock") setScrub(f);
            }}
          />
        </View>

        <View style={styles.row}>
          <Pressable style={[styles.chip, docId === "card" && styles.chipOn]} onPress={() => setDocId("card")}>
            <Text style={styles.chipText}>Card</Text>
          </Pressable>
          <Pressable style={[styles.chip, docId === "showcase" && styles.chipOn]} onPress={() => setDocId("showcase")}>
            <Text style={styles.chipText}>Showcase</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
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
              if (mode === "clock") ref.current?.play();
              setPlaying(mode === "clock");
            }}
          >
            <Text style={styles.btnText}>↺ Restart</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          {[0.5, 1, 1.5, 2].map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, rate === r && styles.chipOn]}
              onPress={() => {
                setRate(r);
                ref.current?.setRate(r);
              }}
            >
              <Text style={styles.chipText}>{r}×</Text>
            </Pressable>
          ))}
          <Text style={styles.meter}>{timeLabel} · {fracLabel}</Text>
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.btn, mode === "clock" ? null : styles.ghost]}
            onPress={() => {
              setMode("clock");
              ref.current?.seekFraction(scrub);
              ref.current?.play();
              setPlaying(true);
            }}
          >
            <Text style={styles.btnText}>Clock</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, mode === "progress" ? null : styles.ghost]}
            onPress={() => {
              setMode("progress");
              ref.current?.pause();
              setPlaying(false);
              setProgress(scrub);
            }}
          >
            <Text style={styles.btnText}>Progress</Text>
          </Pressable>
        </View>

        <Text style={styles.sub}>Scrub / progress · {(mode === "progress" ? progress : scrub).toFixed(3)}</Text>
        <View style={styles.row}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Pressable
              key={v}
              style={styles.chip}
              onPress={() => {
                setScrub(v);
                if (mode === "progress") {
                  setProgress(v);
                  ref.current?.setProgress(v);
                } else {
                  ref.current?.pause();
                  ref.current?.seekFraction(v);
                  setPlaying(false);
                }
              }}
            >
              <Text style={styles.chipText}>{v}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.cases}>
          <Text style={styles.case}>✓ Doc switch (card + showcase)</Text>
          <Text style={styles.case}>✓ Native stage (RN Views — no Canvas dual)</Text>
          <Text style={styles.case}>✓ Transport: play / pause / toggle / restart</Text>
          <Text style={styles.case}>✓ Scrub + rate</Text>
          <Text style={styles.case}>✓ Progress-driven mode (0…1)</Text>
          <Text style={styles.case}>✓ onFrame meter (time + fraction)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0d12" },
  scroll: { padding: 20, gap: 12, paddingBottom: 48 },
  badge: {
    alignSelf: "flex-start",
    color: "#2d6cff",
    borderColor: "#2d6cff55",
    borderWidth: 1,
    backgroundColor: "#2d6cff18",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: "#e7eaf0", fontSize: 22, fontWeight: "700" },
  lede: { color: "#8b93a7", fontSize: 13, lineHeight: 18 },
  stageWrap: { alignItems: "center", paddingVertical: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  btn: { backgroundColor: "#2d6cff", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  ghost: { backgroundColor: "#1e2430" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  chip: { backgroundColor: "#1e2430", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  chipOn: { backgroundColor: "#2d6cff" },
  chipText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  meter: { color: "#8b93a7", fontSize: 13, fontVariant: ["tabular-nums"] },
  sub: { color: "#8b93a7", fontSize: 12 },
  cases: { marginTop: 8, gap: 6 },
  case: { color: "#8b93a7", fontSize: 12 },
});
