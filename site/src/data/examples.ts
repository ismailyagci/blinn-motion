/**
 * Back-compat re-exports — live labs now live on `platforms` in frameworks.ts.
 * Prefer importing from frameworks directly in new code.
 */
import { liveLabs, type Platform } from "./frameworks";

export type LiveExample = {
  id: string;
  name: string;
  stack: string;
  desc: string;
  href: string;
  icon: Platform["id"];
  c: string;
  tint: string;
  flagship?: boolean;
};

export const liveExamples: LiveExample[] = liveLabs.map((p) => ({
  id: p.id,
  name: p.name,
  stack: p.pkg ?? p.badge,
  desc: p.blurb,
  href: p.lab!,
  icon: p.id,
  c: p.c,
  tint: p.tint,
  flagship: p.flagship,
}));
