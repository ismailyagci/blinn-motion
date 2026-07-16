<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/vue";
import { fixtures, type FixtureId } from "../../_shared/fixtures";
import { mountSnippetPanel } from "../../_shared/snippet-panel";

const fixtureMeta: { id: FixtureId; label: string; note: string }[] = [
  { id: "card", label: "Card intro", note: "1.6s product card spring" },
  { id: "showcase", label: "Showcase", note: "gradients · trim · multi-layer" },
];

const docId = ref<FixtureId>("showcase");
const doc = computed(() => fixtures[docId.value]);
const fixtureNote = computed(() => fixtureMeta.find((f) => f.id === docId.value)?.note ?? "");
const mode = ref<"clock" | "progress">("clock");
const progress = ref(0);
const rate = ref(1);
const playing = ref(true);
const time = ref(0);
const fraction = ref(0);
const scrub = ref(0);
const rates = [0.5, 1, 1.5, 2];

const domRef = ref<BlinnMotionHandle | null>(null);
const canvasRef = ref<BlinnMotionHandle | null>(null);
const progressProp = computed(() => (mode.value === "progress" ? progress.value : undefined));
const duration = computed(() => doc.value.duration ?? 1);

onMounted(() => {
  const host = document.getElementById("snippet-host");
  if (host) mountSnippetPanel(host, "vue");
});

const CASES = [
  { k: "Doc switch", v: "card + showcase fixtures" },
  { k: "Dual stages", v: "DOM vs Canvas, same MotionDoc" },
  { k: "Transport", v: "play · pause · toggle · restart" },
  { k: "Scrub + rate", v: "seekFraction · setRate" },
  { k: "Progress mode", v: "controlled 0…1 prop" },
  { k: "onFrame meter", v: "live time + fraction" },
];

function both(fn: (h: BlinnMotionHandle | null) => void) {
  fn(domRef.value);
  fn(canvasRef.value);
}

function onFrame(t: number, f: number) {
  time.value = t;
  fraction.value = f;
  if (mode.value === "clock") scrub.value = f;
}

function applyMode(m: "clock" | "progress") {
  mode.value = m;
  if (m === "progress") {
    both((h) => h?.pause());
    playing.value = false;
    progress.value = scrub.value;
  } else {
    both((h) => {
      h?.seekFraction(scrub.value);
      h?.play();
    });
    playing.value = true;
  }
}

function toggle() {
  both((h) => h?.toggle());
  playing.value = !playing.value;
}

function restart() {
  both((h) => {
    h?.seek(0);
    if (mode.value === "clock") h?.play();
  });
  playing.value = mode.value === "clock";
  scrub.value = 0;
  progress.value = 0;
  time.value = 0;
  fraction.value = 0;
}

function onScrub(v: number) {
  scrub.value = v;
  if (mode.value === "progress") progress.value = v;
  else {
    both((h) => {
      h?.pause();
      h?.seekFraction(v);
    });
    playing.value = false;
  }
}

function setRate(r: number) {
  rate.value = r;
  both((h) => h?.setRate(r));
}

watch(docId, () => {
  playing.value = mode.value === "clock";
  scrub.value = 0;
  progress.value = 0;
  time.value = 0;
  fraction.value = 0;
});
</script>

<template>
  <div class="lab">
    <header class="lab-top">
      <a class="lab-brand" href="https://blinnmotion.com" target="_blank" rel="noreferrer">
        <span class="lab-mark">
          <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
            <rect x="6" y="6" width="52" height="52" rx="15" fill="#11141A" />
            <g fill="none" stroke="#fff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 18 V46" />
              <path d="M24 18 H32.5 C38.6 18 38.6 32 32.5 32 H24" />
              <path d="M24 32 H34.5 C41.2 32 41.2 46 34.5 46 H24" />
            </g>
            <rect x="43.6" y="43.6" width="7.6" height="7.6" rx="1.5" transform="rotate(45 47.4 47.4)" fill="#2F6BFF" />
          </svg>
        </span>
        <span>
          <div class="lab-brand-name">Blinn Motion</div>
          <div class="lab-brand-sub">Example lab</div>
        </span>
      </a>
      <div class="lab-top-grow" />
      <nav class="lab-top-links">
        <a class="lab-link" href="https://docs.blinnmotion.com/adapters/vue" target="_blank" rel="noreferrer">Vue docs ↗</a>
        <a class="lab-link" href="https://docs.blinnmotion.com" target="_blank" rel="noreferrer">All docs ↗</a>
      </nav>
    </header>

    <div class="lab-header">
      <div class="stack-pill"><span class="dot" /> Vue 3 · @blinn-motion/vue</div>
      <h1 class="lab-title">Dual-backend motion lab <em>in Vue</em></h1>
      <p class="lab-lede">
        Same advanced flow as React: dual <code>dom</code> / <code>canvas</code> stages, transport,
        scrub, rate, and progress-driven mode via <code>&lt;BlinnMotion&gt;</code>.
      </p>
    </div>

    <div class="lab-grid">
      <section class="card">
        <div class="card-head">
          <h2>Stage bay</h2>
          <span class="card-meta">{{ fixtureNote }}</span>
        </div>
        <div class="card-body">
          <div class="stages">
            <div class="stage">
              <div class="stage-bar">
                <span class="tag dom">dom</span>
                <span class="hint">CSS · SVG · full fidelity</span>
              </div>
              <div class="stage-host">
                <BlinnMotion
                  ref="domRef"
                  :doc="doc"
                  renderer="dom"
                  :loop="true"
                  :autoplay="mode === 'clock'"
                  :rate="rate"
                  :progress="progressProp"
                  :on-frame="onFrame"
                />
              </div>
            </div>
            <div class="stage">
              <div class="stage-bar">
                <span class="tag canvas">canvas</span>
                <span class="hint">immediate-mode 2D</span>
              </div>
              <div class="stage-host">
                <BlinnMotion
                  ref="canvasRef"
                  :doc="doc"
                  renderer="canvas"
                  :loop="true"
                  :autoplay="mode === 'clock'"
                  :rate="rate"
                  :progress="progressProp"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="card">
        <div class="card-head">
          <h2>Director console</h2>
          <span class="card-meta">live</span>
        </div>
        <div class="card-body">
          <div class="console-section">
            <span class="console-label">MotionDoc</span>
            <div class="seg">
              <button
                v-for="f in fixtureMeta"
                :key="f.id"
                type="button"
                :class="{ on: docId === f.id }"
                @click="docId = f.id"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <div class="console-section">
            <span class="console-label">Transport</span>
            <div class="transport">
              <button type="button" class="btn btn-primary" @click="toggle">
                {{ playing ? "❚❚ Pause" : "▶ Play" }}
              </button>
              <button type="button" class="btn btn-ghost" @click="restart">↺ Restart</button>
            </div>
          </div>

          <div class="console-section">
            <span class="console-label">Timeline</span>
            <div class="meter-block">
              <div class="meter-row">
                <span class="meter-time">
                  {{ time.toFixed(2) }}s
                  <span style="color: var(--ink-3); font-weight: 500; font-size: 13px">
                    / {{ duration.toFixed(2) }}s
                  </span>
                </span>
                <span class="meter-frac">{{ Math.round(fraction * 100) }}% · f={{ fraction.toFixed(3) }}</span>
              </div>
              <input
                class="scrub"
                type="range"
                min="0"
                max="1"
                step="0.001"
                :value="mode === 'progress' ? progress : scrub"
                @input="onScrub(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>

          <div class="console-section">
            <span class="console-label">Rate</span>
            <div class="seg">
              <button
                v-for="r in rates"
                :key="r"
                type="button"
                :class="{ on: rate === r }"
                @click="setRate(r)"
              >
                {{ r }}×
              </button>
            </div>
          </div>

          <div class="console-section">
            <span class="console-label">Drive mode</span>
            <div class="seg">
              <button type="button" :class="{ on: mode === 'clock' }" @click="applyMode('clock')">Clock</button>
              <button type="button" :class="{ on: mode === 'progress' }" @click="applyMode('progress')">
                Progress
              </button>
            </div>
            <p class="mode-note">
              <template v-if="mode === 'clock'">
                <strong>Clock-driven</strong> — shared ticker. Scrub pauses and seeks.
              </template>
              <template v-else>
                <strong>Progress-driven</strong> — controlled <code>progress</code> prop (0…1).
              </template>
            </p>
          </div>
        </div>
      </aside>
    </div>

    <section class="card cases">
      <div class="card-head">
        <h2>Covered cases</h2>
        <span class="card-meta">shared example flow</span>
      </div>
      <div class="card-body">
        <div class="case-grid">
          <div v-for="c in CASES" :key="c.k" class="case">
            <div class="k"><span class="check">✓</span>{{ c.k }}</div>
            <div class="v">{{ c.v }}</div>
          </div>
        </div>
      </div>
    </section>

    <div id="snippet-host"></div>

    <footer class="lab-foot">
      <span>Package <code class="mono">@blinn-motion/vue</code></span>
      <span class="sep">·</span>
      <a href="https://docs.blinnmotion.com/adapters/vue" target="_blank" rel="noreferrer">Adapter docs</a>
      <span class="sep">·</span>
      <a href="https://blinnmotion.com" target="_blank" rel="noreferrer">blinnmotion.com</a>
    </footer>
  </div>
</template>
