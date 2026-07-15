import { useRef, useState } from "react";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/react";
import type { MotionDoc } from "@blinn-motion/core";
import card from "../../../../fixtures/card.motion.json";
import showcase from "../../../../fixtures/showcase.motion.json";

type FixtureId = "card" | "showcase";
const fixtures: Record<FixtureId, MotionDoc> = {
  card: card as MotionDoc,
  showcase: showcase as MotionDoc,
};

export function ReactIsland() {
  const domRef = useRef<BlinnMotionHandle>(null);
  const canvasRef = useRef<BlinnMotionHandle>(null);
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
  const both = (fn: (h: BlinnMotionHandle | null) => void) => {
    fn(domRef.current);
    fn(canvasRef.current);
  };

  return (
    <div className="panel">
      <p className="panel-label">@blinn-motion/react island</p>
      <div className="stages">
        <div>
          <p className="panel-label">dom</p>
          <div className="stage-host">
            <BlinnMotion
              ref={domRef}
              doc={doc}
              renderer="dom"
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
          </div>
        </div>
        <div>
          <p className="panel-label">canvas</p>
          <div className="stage-host">
            <BlinnMotion
              ref={canvasRef}
              doc={doc}
              renderer="canvas"
              loop
              autoplay={mode === "clock"}
              rate={rate}
              progress={progressProp}
            />
          </div>
        </div>
      </div>
      <div className="controls">
        <label className="field">
          MotionDoc
          <select value={docId} onChange={(e) => setDocId(e.target.value as FixtureId)}>
            <option value="card">Card intro</option>
            <option value="showcase">Showcase</option>
          </select>
        </label>
        <button className="btn" type="button" onClick={() => { both((h) => h?.toggle()); setPlaying((p) => !p); }}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button className="btn ghost" type="button" onClick={() => {
          both((h) => { h?.seek(0); if (mode === "clock") h?.play(); });
          setPlaying(mode === "clock");
        }}>↺ Restart</button>
        <label className="field">
          Rate
          <select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); both((h) => h?.setRate(r)); }}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
        <span className="meter">{timeLabel} · {fracLabel}</span>
      </div>
      <div className="mode-row">
        <button className={`btn ${mode === "clock" ? "active" : "ghost"}`} type="button" onClick={() => {
          setMode("clock"); both((h) => { h?.seekFraction(scrub); h?.play(); }); setPlaying(true);
        }}>Clock-driven</button>
        <button className={`btn ${mode === "progress" ? "active" : "ghost"}`} type="button" onClick={() => {
          setMode("progress"); both((h) => h?.pause()); setPlaying(false); setProgress(scrub);
        }}>Progress-driven</button>
        <div className="progress-block">
          <label className="field" style={{ flex: 1 }}>
            Scrub / progress
            <input type="range" min={0} max={1} step={0.001}
              value={mode === "progress" ? progress : scrub}
              onChange={(e) => {
                const v = Number(e.target.value);
                setScrub(v);
                if (mode === "progress") setProgress(v);
                else { both((h) => { h?.pause(); h?.seekFraction(v); }); setPlaying(false); }
              }}
            />
          </label>
        </div>
      </div>
      <div className="cases" style={{ marginTop: 12 }}>
        <div className="case"><strong>Doc switch</strong> card + showcase</div>
        <div className="case"><strong>Dual stages</strong> DOM + Canvas</div>
        <div className="case"><strong>Transport</strong> play / pause / restart</div>
        <div className="case"><strong>Progress mode</strong> controlled 0…1</div>
      </div>
    </div>
  );
}
