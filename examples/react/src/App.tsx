import { useCallback, useMemo, useRef, useState } from "react";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/react";
import type { MotionDoc } from "@blinn-motion/core";
import card from "../../../fixtures/card.motion.json";
import showcase from "../../../fixtures/showcase.motion.json";
import "../../_shared/lab.css";

type FixtureId = "card" | "showcase";
type Mode = "clock" | "progress";

const fixtures: Record<FixtureId, MotionDoc> = {
  card: card as MotionDoc,
  showcase: showcase as MotionDoc,
};

const fixtureMeta: { id: FixtureId; label: string; note: string }[] = [
  { id: "card", label: "Card intro", note: "1.6s product card spring" },
  { id: "showcase", label: "Showcase", note: "gradients · trim · multi-layer" },
];

const rates = [0.5, 1, 1.5, 2];

const CASES = [
  { k: "Doc switch", v: "card + showcase fixtures" },
  { k: "Dual stages", v: "DOM vs Canvas, same MotionDoc" },
  { k: "Transport", v: "play · pause · toggle · restart" },
  { k: "Scrub + rate", v: "seekFraction · setRate" },
  { k: "Progress mode", v: "controlled 0…1 prop" },
  { k: "onFrame meter", v: "live time + fraction" },
];

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
      <rect x="6" y="6" width="52" height="52" rx="15" fill="#11141A" />
      <g fill="none" stroke="#fff" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 18 V46" />
        <path d="M24 18 H32.5 C38.6 18 38.6 32 32.5 32 H24" />
        <path d="M24 32 H34.5 C41.2 32 41.2 46 34.5 46 H24" />
      </g>
      <rect x="43.6" y="43.6" width="7.6" height="7.6" rx="1.5" transform="rotate(45 47.4 47.4)" fill="#2F6BFF" />
    </svg>
  );
}

export function App() {
  const domRef = useRef<BlinnMotionHandle>(null);
  const canvasRef = useRef<BlinnMotionHandle>(null);

  const [docId, setDocId] = useState<FixtureId>("showcase");
  const [mode, setMode] = useState<Mode>("clock");
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [fraction, setFraction] = useState(0);
  const [scrub, setScrub] = useState(0);

  const doc = fixtures[docId];
  const duration = doc.duration ?? 1;
  const progressProp = mode === "progress" ? progress : undefined;

  const both = useCallback((fn: (h: BlinnMotionHandle | null) => void) => {
    fn(domRef.current);
    fn(canvasRef.current);
  }, []);

  const onFrame = useCallback(
    (t: number, f: number) => {
      setTime(t);
      setFraction(f);
      if (mode === "clock") setScrub(f);
    },
    [mode],
  );

  const applyMode = (m: Mode) => {
    setMode(m);
    if (m === "progress") {
      both((h) => h?.pause());
      setPlaying(false);
      setProgress(scrub);
    } else {
      both((h) => {
        h?.seekFraction(scrub);
        h?.play();
      });
      setPlaying(true);
    }
  };

  const fixtureNote = useMemo(
    () => fixtureMeta.find((f) => f.id === docId)?.note ?? "",
    [docId],
  );

  return (
    <div className="lab">
      <header className="lab-top">
        <a className="lab-brand" href="https://blinnmotion.com" target="_blank" rel="noreferrer">
          <span className="lab-mark">
            <BrandMark />
          </span>
          <span>
            <div className="lab-brand-name">Blinn Motion</div>
            <div className="lab-brand-sub">Example lab</div>
          </span>
        </a>
        <div className="lab-top-grow" />
        <nav className="lab-top-links">
          <a className="lab-link" href="https://docs.blinnmotion.com/adapters/react" target="_blank" rel="noreferrer">
            React docs ↗
          </a>
          <a className="lab-link" href="https://docs.blinnmotion.com" target="_blank" rel="noreferrer">
            All docs ↗
          </a>
          <a className="lab-link" href="https://github.com/ismailyagci/blinn-motion/tree/main/examples" target="_blank" rel="noreferrer">
            Examples ↗
          </a>
        </nav>
      </header>

      <div className="lab-header">
        <div className="stack-pill">
          <span className="dot" />
          React · @blinn-motion/react
        </div>
        <h1 className="lab-title">
          Dual-backend motion lab <em>in React</em>
        </h1>
        <p className="lab-lede">
          One <code>MotionDoc</code>, two painters — <code>renderer=&quot;dom&quot;</code> and{" "}
          <code>renderer=&quot;canvas&quot;</code> — sharing core timing. Switch fixtures, scrub the
          timeline, flip into progress-driven mode for scroll/gesture patterns.
        </p>
      </div>

      <div className="lab-grid">
        {/* Theater */}
        <section className="card">
          <div className="card-head">
            <h2>Stage bay</h2>
            <span className="card-meta">{fixtureNote}</span>
          </div>
          <div className="card-body">
            <div className="stages">
              <div className="stage">
                <div className="stage-bar">
                  <span className="tag dom">dom</span>
                  <span className="hint">CSS · SVG · full fidelity</span>
                </div>
                <div className="stage-host">
                  <BlinnMotion
                    ref={domRef}
                    doc={doc}
                    renderer="dom"
                    loop
                    autoplay={mode === "clock"}
                    rate={rate}
                    progress={progressProp}
                    onFrame={onFrame}
                  />
                </div>
              </div>
              <div className="stage">
                <div className="stage-bar">
                  <span className="tag canvas">canvas</span>
                  <span className="hint">immediate-mode 2D</span>
                </div>
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
          </div>
        </section>

        {/* Console */}
        <aside className="card">
          <div className="card-head">
            <h2>Director console</h2>
            <span className="card-meta">live</span>
          </div>
          <div className="card-body">
            <div className="console-section">
              <span className="console-label">MotionDoc</span>
              <div className="seg">
                {fixtureMeta.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={docId === f.id ? "on" : ""}
                    onClick={() => {
                      setDocId(f.id);
                      setPlaying(mode === "clock");
                      setScrub(0);
                      setProgress(0);
                      setTime(0);
                      setFraction(0);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="console-section">
              <span className="console-label">Transport</span>
              <div className="transport">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    both((h) => h?.toggle());
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? "❚❚ Pause" : "▶ Play"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    both((h) => {
                      h?.seek(0);
                      if (mode === "clock") h?.play();
                    });
                    setPlaying(mode === "clock");
                    setScrub(0);
                    setProgress(0);
                    setTime(0);
                    setFraction(0);
                  }}
                >
                  ↺ Restart
                </button>
              </div>
            </div>

            <div className="console-section">
              <span className="console-label">Timeline</span>
              <div className="meter-block">
                <div className="meter-row">
                  <span className="meter-time">
                    {time.toFixed(2)}s
                    <span style={{ color: "var(--ink-3)", fontWeight: 500, fontSize: 13 }}>
                      {" "}
                      / {duration.toFixed(2)}s
                    </span>
                  </span>
                  <span className="meter-frac">{Math.round(fraction * 100)}% · f={fraction.toFixed(3)}</span>
                </div>
                <input
                  className="scrub"
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={mode === "progress" ? progress : scrub}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setScrub(v);
                    if (mode === "progress") {
                      setProgress(v);
                    } else {
                      both((h) => {
                        h?.pause();
                        h?.seekFraction(v);
                      });
                      setPlaying(false);
                    }
                  }}
                />
              </div>
            </div>

            <div className="console-section">
              <span className="console-label">Rate</span>
              <div className="seg">
                {rates.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={rate === r ? "on" : ""}
                    onClick={() => {
                      setRate(r);
                      both((h) => h?.setRate(r));
                    }}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            <div className="console-section">
              <span className="console-label">Drive mode</span>
              <div className="seg">
                <button type="button" className={mode === "clock" ? "on" : ""} onClick={() => applyMode("clock")}>
                  Clock
                </button>
                <button
                  type="button"
                  className={mode === "progress" ? "on" : ""}
                  onClick={() => applyMode("progress")}
                >
                  Progress
                </button>
              </div>
              <p className="mode-note">
                {mode === "clock" ? (
                  <>
                    <strong>Clock-driven</strong> — shared ticker plays the doc. Scrub pauses and seeks.
                  </>
                ) : (
                  <>
                    <strong>Progress-driven</strong> — controlled <code>progress</code> prop (0…1). Use for
                    scroll, drag, or external state.
                  </>
                )}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section className="card cases">
        <div className="card-head">
          <h2>Covered cases</h2>
          <span className="card-meta">shared example flow</span>
        </div>
        <div className="card-body">
          <div className="case-grid">
            {CASES.map((c) => (
              <div key={c.k} className="case">
                <div className="k">
                  <span className="check">✓</span>
                  {c.k}
                </div>
                <div className="v">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="lab-foot">
        <span>
          Package <code className="mono">@blinn-motion/react</code>
        </span>
        <span className="sep">·</span>
        <a href="https://docs.blinnmotion.com/adapters/react" target="_blank" rel="noreferrer">
          Adapter docs
        </a>
        <span className="sep">·</span>
        <a href="https://docs.blinnmotion.com/guides/playback" target="_blank" rel="noreferrer">
          Playback guide
        </a>
        <span className="sep">·</span>
        <a href="https://blinnmotion.com" target="_blank" rel="noreferrer">
          blinnmotion.com
        </a>
      </footer>
    </div>
  );
}
