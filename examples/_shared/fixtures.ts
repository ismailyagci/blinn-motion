import type { MotionDoc } from "@blinn-motion/core";
import card from "../../fixtures/card.motion.json";
import showcase from "../../fixtures/showcase.motion.json";

export type FixtureId = "card" | "showcase";

export const fixtures: Record<FixtureId, MotionDoc> = {
  card: card as MotionDoc,
  showcase: showcase as MotionDoc,
};

export const fixtureList: { id: FixtureId; label: string }[] = [
  { id: "card", label: "Card intro" },
  { id: "showcase", label: "Showcase" },
];
