import { LitElement, html, css } from "lit";
import type { MotionDoc } from "@blinn-motion/core";
import {
  attachBlinnMotion,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";

/**
 * `<blinn-motion>` custom element — plays a MotionDoc via DOM or Canvas.
 *
 * Properties (not attributes for complex values):
 *   el.doc = motionDoc
 *   el.renderer = 'dom' | 'canvas'
 *   el.progress = 0..1  (controlled mode)
 *
 * Events: `frame` with detail `{ time, fraction }`
 * Imperative: el.play(), el.pause(), el.seek(), …
 */
export class BlinnMotionElement extends LitElement implements BlinnMotionHandle {
  static override styles = css`
    :host {
      display: block;
    }
    .host {
      display: block;
    }
  `;

  static override properties = {
    doc: { attribute: false },
    renderer: { type: String },
    loop: { type: Boolean },
    autoplay: { type: Boolean },
    rate: { type: Number },
    // No Number converter — undefined must stay undefined (controlled mode off).
    progress: { attribute: false },
  };

  doc: MotionDoc | null = null;
  renderer: BlinnMotionRenderer = "dom";
  loop = true;
  autoplay = true;
  rate = 1;
  progress: number | undefined = undefined;

  private attached: AttachedBlinnMotion | null = null;
  private hostEl: HTMLDivElement | null = null;
  private viewReady = false;

  override firstUpdated(): void {
    this.hostEl = this.renderRoot.querySelector(".host");
    this.viewReady = true;
    this.remount();
  }

  override updated(changed: Map<string, unknown>): void {
    if (!this.viewReady || !this.hostEl) return;
    const structural =
      changed.has("doc") ||
      changed.has("renderer") ||
      changed.has("loop") ||
      changed.has("rate") ||
      changed.has("autoplay") ||
      (changed.has("progress") &&
        (changed.get("progress") == null) !== (this.progress == null));

    if (structural) {
      this.remount();
    } else if (changed.has("progress") && this.progress != null) {
      this.attached?.setControlledProgress(this.progress);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.attached?.dispose();
    this.attached = null;
  }

  private remount(): void {
    this.attached?.dispose();
    this.attached = null;
    if (!this.hostEl || !this.doc) return;
    this.attached = attachBlinnMotion(this.hostEl, {
      doc: this.doc,
      renderer: this.renderer,
      loop: this.loop,
      autoplay: this.autoplay,
      rate: this.rate,
      progress: this.progress,
      onFrame: (time, fraction) => {
        this.dispatchEvent(
          new CustomEvent("frame", {
            detail: { time, fraction },
            bubbles: true,
            composed: true,
          }),
        );
      },
    });
  }

  play(): void {
    this.attached?.play();
  }
  pause(): void {
    this.attached?.pause();
  }
  stop(): void {
    this.attached?.stop();
  }
  toggle(): void {
    this.attached?.toggle();
  }
  seek(time: number): void {
    this.attached?.seek(time);
  }
  seekFraction(f: number): void {
    this.attached?.seekFraction(f);
  }
  setProgress(progress: number): void {
    this.attached?.setProgress(progress);
  }
  setRate(rate: number): void {
    this.attached?.setRate(rate);
  }
  get player(): BlinnMotionPlayer | null {
    return this.attached?.player ?? null;
  }
  get duration(): number {
    return this.attached?.duration ?? 0;
  }
  get time(): number {
    return this.attached?.time ?? 0;
  }
  get isPlaying(): boolean {
    return this.attached?.isPlaying ?? false;
  }

  override render() {
    return html`<div class="host"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blinn-motion": BlinnMotionElement;
  }
}

export function defineBlinnMotionElement(tag = "blinn-motion"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tag)) {
    customElements.define(tag, BlinnMotionElement);
  }
}

// Auto-register when loaded in a browser
defineBlinnMotionElement();
