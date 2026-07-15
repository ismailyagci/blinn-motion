<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/vue";
import { fixtures, fixtureList, type FixtureId } from "../../_shared/fixtures";

const docId = ref<FixtureId>("showcase");
const doc = computed(() => fixtures[docId.value]);
const mode = ref<"clock" | "progress">("clock");
const progress = ref(0);
const rate = ref(1);
const playing = ref(true);
const timeLabel = ref("0.00s");
const fracLabel = ref("0%");
const scrub = ref(0);

const domRef = ref<BlinnMotionHandle | null>(null);
const canvasRef = ref<BlinnMotionHandle | null>(null);

const progressProp = computed(() => (mode.value === "progress" ? progress.value : undefined));

function both(fn: (h: BlinnMotionHandle | null) => void) {
  fn(domRef.value);
  fn(canvasRef.value);
}

function onFrame(t: number, f: number) {
  timeLabel.value = `${t.toFixed(2)}s`;
  fracLabel.value = `${Math.round(f * 100)}%`;
  if (mode.value === "clock") scrub.value = f;
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
}

function onScrub(v: number) {
  scrub.value = v;
  if (mode.value === "progress") {
    progress.value = v;
  } else {
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

watch(mode, (m) => {
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
});
</script>

<template>
  <div class="demo">
    <div class="stack-badge">Vue 3 · @blinn-motion/vue</div>
    <h1>Blinn Motion · Vue advanced demo</h1>
    <p class="lede">
      Same shared flow as every other stack: MotionDoc switch, dual <code>dom</code> /
      <code>canvas</code> stages, transport controls, scrub, rate, and progress-driven mode via
      <code>&lt;BlinnMotion&gt;</code>.
    </p>

    <div class="stages">
      <div class="panel">
        <p class="panel-label">renderer="dom"</p>
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
      <div class="panel">
        <p class="panel-label">renderer="canvas"</p>
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

    <div class="panel">
      <p class="panel-label">Transport &amp; cases</p>
      <div class="controls">
        <label class="field">
          MotionDoc
          <select v-model="docId">
            <option v-for="f in fixtureList" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
        <button class="btn" type="button" @click="toggle">{{ playing ? "❚❚ Pause" : "▶ Play" }}</button>
        <button class="btn ghost" type="button" @click="restart">↺ Restart</button>
        <label class="field">
          Rate
          <select :value="rate" @change="setRate(Number(($event.target as HTMLSelectElement).value))">
            <option :value="0.5">0.5×</option>
            <option :value="1">1×</option>
            <option :value="1.5">1.5×</option>
            <option :value="2">2×</option>
          </select>
        </label>
        <span class="meter">{{ timeLabel }} · {{ fracLabel }}</span>
      </div>

      <div class="mode-row">
        <button class="btn" :class="{ active: mode === 'clock', ghost: mode !== 'clock' }" type="button" @click="mode = 'clock'">
          Clock-driven
        </button>
        <button class="btn" :class="{ active: mode === 'progress', ghost: mode !== 'progress' }" type="button" @click="mode = 'progress'">
          Progress-driven
        </button>
        <div class="progress-block">
          <label class="field" style="flex: 1">
            Scrub / progress
            <input type="range" min="0" max="1" step="0.001" :value="mode === 'progress' ? progress : scrub" @input="onScrub(Number(($event.target as HTMLInputElement).value))" />
          </label>
        </div>
      </div>
      <p class="hint">Progress mode sets the controlled <code>progress</code> prop (0…1) and pauses the ticker — ideal for scroll/gesture.</p>
    </div>

    <div class="cases">
      <div class="case"><strong>Doc switch</strong> card + showcase fixtures</div>
      <div class="case"><strong>Dual stages</strong> DOM vs Canvas same MotionDoc</div>
      <div class="case"><strong>Transport</strong> play / pause / toggle / restart</div>
      <div class="case"><strong>Scrub + rate</strong> seekFraction + setRate</div>
      <div class="case"><strong>Progress mode</strong> controlled 0…1 prop</div>
      <div class="case"><strong>onFrame meter</strong> live time + fraction</div>
    </div>
  </div>
</template>
