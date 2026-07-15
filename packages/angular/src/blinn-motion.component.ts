import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import type { AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import type { MotionDoc } from "@blinn-motion/core";
import {
  attachBlinnMotion,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";

/**
 * Standalone Angular component: `<blinn-motion [doc]="doc" renderer="canvas" />`.
 * Imperative controls are available on the component instance (ViewChild).
 */
@Component({
  selector: "blinn-motion",
  standalone: true,
  template: `<div #host class="blinn-motion-host" [class]="className" [style]="style"></div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .blinn-motion-host {
        display: block;
      }
    `,
  ],
})
export class BlinnMotionComponent implements AfterViewInit, OnChanges, OnDestroy, BlinnMotionHandle {
  @ViewChild("host", { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) doc!: MotionDoc;
  @Input() renderer: BlinnMotionRenderer = "dom";
  @Input() loop = true;
  @Input() autoplay = true;
  @Input() rate = 1;
  /** Controlled progress 0..1 — disables autoplay while set. */
  @Input() progress?: number;
  @Input() className?: string;
  @Input() style?: Record<string, string | number | undefined>;

  @Output() frame = new EventEmitter<{ time: number; fraction: number }>();

  private attached: AttachedBlinnMotion | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.remount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;

    const structural =
      changes["doc"] ||
      changes["renderer"] ||
      changes["loop"] ||
      changes["rate"] ||
      changes["autoplay"] ||
      (changes["progress"] &&
        (changes["progress"].previousValue == null) !== (changes["progress"].currentValue == null));

    if (structural) {
      this.remount();
    } else if (changes["progress"] && this.progress != null) {
      this.attached?.setControlledProgress(this.progress);
    }
  }

  ngOnDestroy(): void {
    this.attached?.dispose();
    this.attached = null;
  }

  /** Idempotent remount helper for hosts that need an explicit kick. */
  ensureMounted(): void {
    this.viewReady = true;
    if (!this.attached) this.remount();
  }

  private remount(): void {
    this.attached?.dispose();
    this.attached = null;
    const host = this.hostRef?.nativeElement;
    if (!host || !this.doc) return;
    this.attached = attachBlinnMotion(host, {
      doc: this.doc,
      renderer: this.renderer,
      loop: this.loop,
      autoplay: this.autoplay,
      rate: this.rate,
      progress: this.progress,
      onFrame: (time, fraction) => this.frame.emit({ time, fraction }),
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
}
