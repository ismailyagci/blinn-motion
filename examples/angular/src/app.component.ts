import { Component, ViewChild, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BlinnMotionComponent } from "@blinn-motion/angular";
import type { MotionDoc } from "@blinn-motion/core";
import { fixtures, fixtureList, type FixtureId } from "../../_shared/fixtures";

@Component({
  selector: "blinn-angular-demo",
  standalone: true,
  imports: [CommonModule, BlinnMotionComponent],
  template: `
    <div class="demo">
      <div class="stack-badge">Angular 19 · &#64;blinn-motion/angular</div>
      <h1>Blinn Motion · Angular advanced demo</h1>
      <p class="lede">
        Standalone <code>&lt;blinn-motion&gt;</code> component with dual DOM/Canvas stages,
        transport controls, scrub, rate, and progress-driven mode via the <code>[progress]</code> input.
      </p>

      <div class="stages">
        <div class="panel">
          <p class="panel-label">renderer="dom"</p>
          <div class="stage-host">
            <blinn-motion
              #domMotion
              [doc]="doc"
              renderer="dom"
              [loop]="true"
              [autoplay]="mode === 'clock'"
              [rate]="rate"
              [progress]="progressProp"
              (frame)="onFrame($event)"
            ></blinn-motion>
          </div>
        </div>
        <div class="panel">
          <p class="panel-label">renderer="canvas"</p>
          <div class="stage-host">
            <blinn-motion
              #canvasMotion
              [doc]="doc"
              renderer="canvas"
              [loop]="true"
              [autoplay]="mode === 'clock'"
              [rate]="rate"
              [progress]="progressProp"
            ></blinn-motion>
          </div>
        </div>
      </div>

      <div class="panel">
        <p class="panel-label">Transport &amp; cases</p>
        <div class="controls">
          <label class="field">
            MotionDoc
            <select [value]="docId" (change)="onDocChange($any($event.target).value)">
              <option *ngFor="let f of fixtureList" [value]="f.id">{{ f.label }}</option>
            </select>
          </label>
          <button class="btn" type="button" (click)="toggle()">{{ playing ? "❚❚ Pause" : "▶ Play" }}</button>
          <button class="btn ghost" type="button" (click)="restart()">↺ Restart</button>
          <label class="field">
            Rate
            <select [value]="rate" (change)="setRate(+$any($event.target).value)">
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
            </select>
          </label>
          <span class="meter">{{ timeLabel }} · {{ fracLabel }}</span>
        </div>
        <div class="mode-row">
          <button class="btn" [class.active]="mode === 'clock'" [class.ghost]="mode !== 'clock'" type="button" (click)="setMode('clock')">Clock-driven</button>
          <button class="btn" [class.active]="mode === 'progress'" [class.ghost]="mode !== 'progress'" type="button" (click)="setMode('progress')">Progress-driven</button>
          <div class="progress-block">
            <label class="field" style="flex:1">
              Scrub / progress
              <input type="range" min="0" max="1" step="0.001"
                [value]="mode === 'progress' ? progress : scrub"
                (input)="onScrub(+$any($event.target).value)" />
            </label>
          </div>
        </div>
        <p class="hint">Progress mode binds the controlled <code>[progress]</code> input (0…1).</p>
      </div>

      <div class="cases">
        <div class="case"><strong>Doc switch</strong> card + showcase fixtures</div>
        <div class="case"><strong>Dual stages</strong> DOM vs Canvas same MotionDoc</div>
        <div class="case"><strong>Transport</strong> play / pause / toggle / restart</div>
        <div class="case"><strong>Scrub + rate</strong> seekFraction + setRate</div>
        <div class="case"><strong>Progress mode</strong> controlled 0…1 input</div>
        <div class="case"><strong>frame output</strong> live time + fraction</div>
      </div>
    </div>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild("domMotion") domMotion?: BlinnMotionComponent;
  @ViewChild("canvasMotion") canvasMotion?: BlinnMotionComponent;

  fixtureList = fixtureList;
  docId: FixtureId = "showcase";
  doc: MotionDoc = fixtures.showcase;
  mode: "clock" | "progress" = "clock";
  progress = 0;
  rate = 1;
  playing = true;
  timeLabel = "0.00s";
  fracLabel = "0%";
  scrub = 0;

  get progressProp(): number | undefined {
    return this.mode === "progress" ? this.progress : undefined;
  }

  ngAfterViewInit(): void {
    this.domMotion?.ensureMounted();
    this.canvasMotion?.ensureMounted();
  }

  private both(fn: (c: BlinnMotionComponent | undefined) => void) {
    fn(this.domMotion);
    fn(this.canvasMotion);
  }

  onDocChange(id: string) {
    this.docId = id as FixtureId;
    this.doc = fixtures[this.docId];
  }

  onFrame(e: { time: number; fraction: number }) {
    this.timeLabel = `${e.time.toFixed(2)}s`;
    this.fracLabel = `${Math.round(e.fraction * 100)}%`;
    if (this.mode === "clock") this.scrub = e.fraction;
  }

  toggle() {
    this.both((c) => c?.toggle());
    this.playing = !this.playing;
  }

  restart() {
    this.both((c) => {
      c?.seek(0);
      if (this.mode === "clock") c?.play();
    });
    this.playing = this.mode === "clock";
  }

  onScrub(v: number) {
    this.scrub = v;
    if (this.mode === "progress") this.progress = v;
    else {
      this.both((c) => {
        c?.pause();
        c?.seekFraction(v);
      });
      this.playing = false;
    }
  }

  setRate(r: number) {
    this.rate = Number(r);
    this.both((c) => c?.setRate(this.rate));
  }

  setMode(m: "clock" | "progress") {
    this.mode = m;
    if (m === "progress") {
      this.both((c) => c?.pause());
      this.playing = false;
      this.progress = this.scrub;
    } else {
      this.both((c) => {
        c?.seekFraction(this.scrub);
        c?.play();
      });
      this.playing = true;
    }
  }
}
