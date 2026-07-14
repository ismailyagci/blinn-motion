import { useRef, useState } from "react";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/react";
import type { MotionDoc } from "@blinn-motion/core";
import doc from "../../../fixtures/card.motion.json";

const motionDoc = doc as MotionDoc;

const pane: React.CSSProperties = {
  background: "#11141b",
  border: "1px solid #1e2430",
  borderRadius: 14,
  padding: 16,
};
const label: React.CSSProperties = { fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#8b93a7", margin: "0 0 12px" };
const btn: React.CSSProperties = { background: "#2d6cff", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer" };

export function App() {
  const domRef = useRef<BlinnMotionHandle>(null);
  const canvasRef = useRef<BlinnMotionHandle>(null);
  const [playing, setPlaying] = useState(true);

  const both = (fn: (h: BlinnMotionHandle | null) => void) => {
    fn(domRef.current);
    fn(canvasRef.current);
  };

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>BlinnMotion · React</h1>
      <p style={{ color: "#8b93a7", margin: "0 0 24px", fontSize: 14 }}>
        The same <code>&lt;BlinnMotion doc /&gt;</code> component, rendered with the{" "}
        <strong>dom</strong> and <strong>canvas</strong> backends — one shared render method.
      </p>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div style={pane}>
          <p style={label}>renderer="dom"</p>
          <BlinnMotion ref={domRef} doc={motionDoc} renderer="dom" loop autoplay />
        </div>
        <div style={pane}>
          <p style={label}>renderer="canvas"</p>
          <BlinnMotion ref={canvasRef} doc={motionDoc} renderer="canvas" loop autoplay />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
        <button
          style={btn}
          onClick={() => {
            both((h) => h?.toggle());
            setPlaying((p) => !p);
          }}
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button
          style={{ ...btn, background: "#1e2430" }}
          onClick={() => {
            both((h) => {
              h?.seek(0);
              h?.play();
            });
            setPlaying(true);
          }}
        >
          ↺ Restart
        </button>
      </div>
    </main>
  );
}
