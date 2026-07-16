<script lang="ts">
  import { onMount } from "svelte";
  import { blinnMotion, getBlinnHandle, type BlinnMotionHandle } from "@blinn-motion/svelte";
  import { fixtures, fixtureList, type FixtureId } from "../../_shared/fixtures";
  import { mountSnippetPanel } from "../../_shared/snippet-panel";

  onMount(() => {
    const host = document.getElementById("snippet-host");
    if (host) mountSnippetPanel(host, "svelte");
  });

  let docId: FixtureId = $state("showcase");
  let mode: "clock" | "progress" = $state("clock");
  let progress = $state(0);
  let rate = $state(1);
  let playing = $state(true);
  let timeLabel = $state("0.00s");
  let fracLabel = $state("0%");
  let scrub = $state(0);

  let domEl: HTMLDivElement | undefined = $state();
  let canvasEl: HTMLDivElement | undefined = $state();

  const doc = $derived(fixtures[docId]);
  const progressOpt = $derived(mode === "progress" ? progress : undefined);

  function both(fn: (h: BlinnMotionHandle | null) => void) {
    fn(getBlinnHandle(domEl));
    fn(getBlinnHandle(canvasEl));
  }

  function onFrame(t: number, f: number) {
    timeLabel = `${t.toFixed(2)}s`;
    fracLabel = `${Math.round(f * 100)}%`;
    if (mode === "clock") scrub = f;
  }

  function toggle() {
    both((h) => h?.toggle());
    playing = !playing;
  }
  function restart() {
    both((h) => {
      h?.seek(0);
      if (mode === "clock") h?.play();
    });
    playing = mode === "clock";
  }
  function onScrub(v: number) {
    scrub = v;
    if (mode === "progress") progress = v;
    else {
      both((h) => {
        h?.pause();
        h?.seekFraction(v);
      });
      playing = false;
    }
  }
  function setRate(r: number) {
    rate = r;
    both((h) => h?.setRate(r));
  }
  function setMode(m: "clock" | "progress") {
    mode = m;
    if (m === "progress") {
      both((h) => h?.pause());
      playing = false;
      progress = scrub;
    } else {
      both((h) => {
        h?.seekFraction(scrub);
        h?.play();
      });
      playing = true;
    }
  }

  const domParams = $derived({
    doc,
    renderer: "dom" as const,
    loop: true,
    autoplay: mode === "clock",
    rate,
    progress: progressOpt,
    onFrame,
  });
  const canvasParams = $derived({
    doc,
    renderer: "canvas" as const,
    loop: true,
    autoplay: mode === "clock",
    rate,
    progress: progressOpt,
  });
</script>

<div class="demo">
  <div class="stack-badge">Svelte 5 · @blinn-motion/svelte</div>
  <h1>Blinn Motion · Svelte advanced demo</h1>
  <p class="lede">
    Idiomatic <code>use:blinnMotion</code> action on host nodes — dual DOM/Canvas stages, full transport,
    scrub, rate, and progress-driven mode.
  </p>

  <div class="stages">
    <div class="panel">
      <p class="panel-label">renderer="dom"</p>
      <div class="stage-host" bind:this={domEl} use:blinnMotion={domParams}></div>
    </div>
    <div class="panel">
      <p class="panel-label">renderer="canvas"</p>
      <div class="stage-host" bind:this={canvasEl} use:blinnMotion={canvasParams}></div>
    </div>
  </div>

  <div class="panel">
    <p class="panel-label">Transport &amp; cases</p>
    <div class="controls">
      <label class="field">
        MotionDoc
        <select bind:value={docId}>
          {#each fixtureList as f}
            <option value={f.id}>{f.label}</option>
          {/each}
        </select>
      </label>
      <button class="btn" type="button" onclick={toggle}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
      <button class="btn ghost" type="button" onclick={restart}>↺ Restart</button>
      <label class="field">
        Rate
        <select value={rate} onchange={(e) => setRate(Number(e.currentTarget.value))}>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
      </label>
      <span class="meter">{timeLabel} · {fracLabel}</span>
    </div>
    <div class="mode-row">
      <button class="btn" class:active={mode === "clock"} class:ghost={mode !== "clock"} type="button" onclick={() => setMode("clock")}>Clock-driven</button>
      <button class="btn" class:active={mode === "progress"} class:ghost={mode !== "progress"} type="button" onclick={() => setMode("progress")}>Progress-driven</button>
      <div class="progress-block">
        <label class="field" style="flex:1">
          Scrub / progress
          <input type="range" min="0" max="1" step="0.001" value={mode === "progress" ? progress : scrub} oninput={(e) => onScrub(Number(e.currentTarget.value))} />
        </label>
      </div>
    </div>
    <p class="hint">Progress mode uses controlled <code>progress</code> on the action params (0…1).</p>
  </div>

  <div class="cases">
    <div class="case"><strong>Doc switch</strong> card + showcase fixtures</div>
    <div class="case"><strong>Dual stages</strong> DOM vs Canvas same MotionDoc</div>
    <div class="case"><strong>Transport</strong> play / pause / toggle / restart</div>
    <div class="case"><strong>Scrub + rate</strong> seekFraction + setRate</div>
    <div class="case"><strong>Progress mode</strong> controlled 0…1 param</div>
    <div class="case"><strong>onFrame meter</strong> live time + fraction</div>
  </div>

  <div id="snippet-host"></div>
</div>
