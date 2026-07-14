import type { MotionDoc } from "../scripts/blinn-motion-mini";

/* The `card` MotionDoc — the same hand-authored sample used by Blinn Motion's
   tests and examples (fixtures/card.motion.json), lightly extended with a
   subtitle + underline so the hero shows more of the timeline. Every value
   here is exactly what the Figma-plugin would emit. */
export const cardDoc: MotionDoc = {
  duration: 1.8,
  fps: 60,
  stage: { width: 375, height: 600, background: "#0E1116FF" },
  layers: [
    {
      id: "card",
      name: "Card",
      type: "rect",
      base: {
        x: 44,
        y: 188,
        width: 287,
        height: 224,
        opacity: 1,
        anchor: { x: 0.5, y: 0.5 },
        cornerRadius: [26, 26, 26, 26],
        fill: { type: "solid", color: "#2F6BFFFF" },
      },
      tracks: [
        {
          property: "opacity",
          op: "set",
          keys: [
            { t: 0.0, v: 0, easing: { type: "cubicBezier", p: [0, 0, 0.58, 1] } },
            { t: 0.45, v: 1, easing: { type: "hold" } },
          ],
        },
        {
          property: "translateY",
          op: "offset",
          keys: [
            { t: 0.0, v: 90, easing: { type: "spring", bounce: 0.45 } },
            { t: 0.9, v: 0, easing: { type: "hold" } },
          ],
        },
        {
          property: "scaleXY",
          op: "set",
          keys: [
            { t: 0.0, v: [0.7, 0.7], easing: { type: "spring", bounce: 0.55 } },
            { t: 0.9, v: [1, 1], easing: { type: "hold" } },
          ],
        },
      ],
      children: [
        {
          id: "badge",
          name: "Badge",
          type: "ellipse",
          base: {
            x: 26,
            y: 26,
            width: 56,
            height: 56,
            anchor: { x: 0.5, y: 0.5 },
            fill: { type: "solid", color: "#FFBE16FF" },
          },
          tracks: [
            {
              property: "rotation",
              op: "offset",
              keys: [
                { t: 0.0, v: 0, easing: { type: "linear" } },
                { t: 1.8, v: 360, easing: { type: "hold" } },
              ],
            },
            {
              property: "scaleXY",
              op: "set",
              keys: [
                { t: 0.4, v: [1, 1], easing: { type: "cubicBezier", p: [0.42, 0, 0.58, 1] } },
                { t: 0.7, v: [1.28, 1.28], easing: { type: "cubicBezier", p: [0.42, 0, 0.58, 1] } },
                { t: 1.0, v: [1, 1], easing: { type: "hold" } },
              ],
            },
            {
              property: "fillColor",
              op: "set",
              keys: [
                { t: 0.4, v: "#FFBE16FF" as never, easing: { type: "linear" } },
                { t: 1.0, v: "#FF6585FF" as never, easing: { type: "hold" } },
              ],
            },
          ],
        },
        {
          id: "title",
          name: "Title",
          type: "text",
          base: {
            x: 26,
            y: 104,
            width: 235,
            height: 34,
            anchor: { x: 0, y: 0.5 },
            text: { characters: "Animate once.", fontSize: 27, fontWeight: 800, color: "#FFFFFFFF", letterSpacing: -0.5 },
          },
          tracks: [
            {
              property: "opacity",
              op: "set",
              keys: [
                { t: 0.5, v: 0, easing: { type: "cubicBezier", p: [0, 0, 0.58, 1] } },
                { t: 0.9, v: 1, easing: { type: "hold" } },
              ],
            },
            {
              property: "translateX",
              op: "offset",
              keys: [
                { t: 0.5, v: -26, easing: { type: "cubicBezier", p: [0.16, 1, 0.3, 1] } },
                { t: 0.95, v: 0, easing: { type: "hold" } },
              ],
            },
          ],
        },
        {
          id: "subtitle",
          name: "Subtitle",
          type: "text",
          base: {
            x: 26,
            y: 142,
            width: 235,
            height: 26,
            anchor: { x: 0, y: 0.5 },
            text: { characters: "Render everywhere.", fontSize: 18, fontWeight: 500, color: "#FFFFFFCC" },
          },
          tracks: [
            {
              property: "opacity",
              op: "set",
              keys: [
                { t: 0.62, v: 0, easing: { type: "cubicBezier", p: [0, 0, 0.58, 1] } },
                { t: 1.02, v: 0.8, easing: { type: "hold" } },
              ],
            },
            {
              property: "translateX",
              op: "offset",
              keys: [
                { t: 0.62, v: -26, easing: { type: "cubicBezier", p: [0.16, 1, 0.3, 1] } },
                { t: 1.07, v: 0, easing: { type: "hold" } },
              ],
            },
          ],
        },
        {
          id: "underline",
          name: "Underline",
          type: "rect",
          base: {
            x: 26,
            y: 184,
            width: 120,
            height: 5,
            anchor: { x: 0, y: 0.5 },
            cornerRadius: [3, 3, 3, 3],
            fill: { type: "solid", color: "#FFFFFFFF" },
          },
          tracks: [
            {
              property: "scaleX",
              op: "set",
              keys: [
                { t: 0.78, v: 0, easing: { type: "cubicBezier", p: [0.16, 1, 0.3, 1] } },
                { t: 1.25, v: 1, easing: { type: "hold" } },
              ],
            },
            {
              property: "opacity",
              op: "set",
              keys: [
                { t: 0.78, v: 0, easing: { type: "linear" } },
                { t: 0.9, v: 0.9, easing: { type: "hold" } },
              ],
            },
          ],
        },
      ],
    },
  ],
};
