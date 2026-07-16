import { LitElement, html } from "lit";
import {
  defineBlinnMotionElement,
  type BlinnMotionElement as BMEl,
} from "@blinn-motion/lit";
import { fixtures, fixtureList, type FixtureId } from "../../_shared/fixtures";
import { mountSnippetPanel } from "../../_shared/snippet-panel";

defineBlinnMotionElement();

class BlinnDemoApp extends LitElement {
  static properties = {
    docId: { type: String },
    mode: { type: String },
    progress: { type: Number },
    rate: { type: Number },
    playing: { type: Boolean },
    timeLabel: { type: String },
    fracLabel: { type: String },
    scrub: { type: Number },
  };

  docId: FixtureId = "showcase";
  mode: "clock" | "progress" = "clock";
  progress = 0;
  rate = 1;
  playing = true;
  timeLabel = "0.00s";
  fracLabel = "0%";
  scrub = 0;

  createRenderRoot() {
    return this; // light DOM so shared CSS applies
  }

  private get stages(): BMEl[] {
    return [...this.querySelectorAll("blinn-motion")] as BMEl[];
  }

  private both(fn: (el: BMEl) => void) {
    this.stages.forEach(fn);
  }

  private onFrame = (e: Event) => {
    const { time, fraction } = (e as CustomEvent<{ time: number; fraction: number }>).detail;
    this.timeLabel = `${time.toFixed(2)}s`;
    this.fracLabel = `${Math.round(fraction * 100)}%`;
    if (this.mode === "clock") this.scrub = fraction;
  };

  private syncProps() {
    const doc = fixtures[this.docId];
    const progress = this.mode === "progress" ? this.progress : undefined;
    this.both((el) => {
      el.doc = doc;
      el.loop = true;
      el.rate = this.rate;
      el.autoplay = this.mode === "clock";
      el.progress = progress as number | undefined;
    });
  }

  firstUpdated() {
    this.syncProps();
    const primary = this.querySelector("blinn-motion") as BMEl | null;
    primary?.addEventListener("frame", this.onFrame);
    const host = this.querySelector("#snippet-host") as HTMLElement | null;
    if (host && !host.dataset.mounted) {
      host.dataset.mounted = "1";
      mountSnippetPanel(host, "lit");
    }
  }

  updated() {
    this.syncProps();
  }

  private toggle() {
    this.both((el) => el.toggle());
    this.playing = !this.playing;
  }
  private restart() {
    this.both((el) => {
      el.seek(0);
      if (this.mode === "clock") el.play();
    });
    this.playing = this.mode === "clock";
  }
  private onScrub(v: number) {
    this.scrub = v;
    if (this.mode === "progress") this.progress = v;
    else {
      this.both((el) => {
        el.pause();
        el.seekFraction(v);
      });
      this.playing = false;
    }
  }
  private setMode(m: "clock" | "progress") {
    this.mode = m;
    if (m === "progress") {
      this.both((el) => el.pause());
      this.playing = false;
      this.progress = this.scrub;
    } else {
      this.both((el) => {
        el.seekFraction(this.scrub);
        el.play();
      });
      this.playing = true;
    }
  }

  render() {
    return html`
      <div class="demo">
        <div class="stack-badge">Lit 3 · @blinn-motion/lit · &lt;blinn-motion&gt;</div>
        <h1>Blinn Motion · Lit advanced demo</h1>
        <p class="lede">
          Web component API: property-driven <code>&lt;blinn-motion&gt;</code> with dual backends,
          full transport, scrub, rate, and progress-driven mode via the <code>progress</code> property.
        </p>
        <div class="stages">
          <div class="panel">
            <p class="panel-label">renderer="dom"</p>
            <div class="stage-host">
              <blinn-motion .renderer=${"dom"}></blinn-motion>
            </div>
          </div>
          <div class="panel">
            <p class="panel-label">renderer="canvas"</p>
            <div class="stage-host">
              <blinn-motion .renderer=${"canvas"}></blinn-motion>
            </div>
          </div>
        </div>
        <div class="panel">
          <p class="panel-label">Transport &amp; cases</p>
          <div class="controls">
            <label class="field">
              MotionDoc
              <select @change=${(e: Event) => { this.docId = (e.target as HTMLSelectElement).value as FixtureId; }}>
                ${fixtureList.map((f) => html`<option value=${f.id} ?selected=${f.id === this.docId}>${f.label}</option>`)}
              </select>
            </label>
            <button class="btn" type="button" @click=${() => this.toggle()}>
              ${this.playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button class="btn ghost" type="button" @click=${() => this.restart()}>↺ Restart</button>
            <label class="field">
              Rate
              <select @change=${(e: Event) => { this.rate = Number((e.target as HTMLSelectElement).value); this.both((el) => el.setRate(this.rate)); }}>
                <option value="0.5" ?selected=${this.rate === 0.5}>0.5×</option>
                <option value="1" ?selected=${this.rate === 1}>1×</option>
                <option value="1.5" ?selected=${this.rate === 1.5}>1.5×</option>
                <option value="2" ?selected=${this.rate === 2}>2×</option>
              </select>
            </label>
            <span class="meter">${this.timeLabel} · ${this.fracLabel}</span>
          </div>
          <div class="mode-row">
            <button class="btn ${this.mode === "clock" ? "active" : "ghost"}" type="button" @click=${() => this.setMode("clock")}>Clock-driven</button>
            <button class="btn ${this.mode === "progress" ? "active" : "ghost"}" type="button" @click=${() => this.setMode("progress")}>Progress-driven</button>
            <div class="progress-block">
              <label class="field" style="flex:1">
                Scrub / progress
                <input type="range" min="0" max="1" step="0.001"
                  .value=${String(this.mode === "progress" ? this.progress : this.scrub)}
                  @input=${(e: Event) => this.onScrub(Number((e.target as HTMLInputElement).value))} />
              </label>
            </div>
          </div>
          <p class="hint">Progress mode sets the element <code>progress</code> property (0…1).</p>
        </div>
        <div class="cases">
          <div class="case"><strong>Doc switch</strong> card + showcase fixtures</div>
          <div class="case"><strong>Dual stages</strong> DOM vs Canvas same MotionDoc</div>
          <div class="case"><strong>Transport</strong> play / pause / toggle / restart</div>
          <div class="case"><strong>Scrub + rate</strong> seekFraction + setRate</div>
          <div class="case"><strong>Progress mode</strong> controlled 0…1 property</div>
          <div class="case"><strong>frame event</strong> live time + fraction</div>
        </div>
        <div id="snippet-host"></div>
      </div>
    `;
  }
}

customElements.define("blinn-demo", BlinnDemoApp);
