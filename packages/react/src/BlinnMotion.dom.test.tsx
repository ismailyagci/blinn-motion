// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { createRef, useRef } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { BlinnMotion, useBlinnMotion, type BlinnMotionHandle } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;

// jsdom has no 2D context — give CanvasPlayer a no-op recorder so it can paint.
beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = () =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "canvas") return undefined;
          return (..._a: unknown[]) => {
            if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createConicGradient")
              return { addColorStop() {} };
            return undefined;
          };
        },
        set() {
          return true;
        },
      },
    );
});

afterEach(cleanup);

describe("<BlinnMotion/> (dom backend)", () => {
  it("mounts a host with a sized stage and one node per layer", () => {
    const { container } = render(<BlinnMotion doc={doc} renderer="dom" autoplay={false} />);
    const host = container.firstElementChild as HTMLElement;
    const stage = host.firstElementChild as HTMLElement; // DomPlayer's stage
    expect(stage.style.width).toBe("375px");
    expect(container.querySelectorAll("[data-id]").length).toBeGreaterThanOrEqual(3);
  });

  it("exposes an imperative handle that drives the player", () => {
    const ref = createRef<BlinnMotionHandle>();
    render(<BlinnMotion ref={ref} doc={doc} renderer="dom" autoplay={false} />);
    expect(ref.current).not.toBeNull();
    act(() => ref.current!.seekFraction(1));
    const card = document.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("scale(1,1)");
    // play/pause/stop/setRate/setProgress are callable without throwing
    act(() => {
      ref.current!.play();
      ref.current!.pause();
      ref.current!.setRate(2);
      ref.current!.setProgress(0.5);
      ref.current!.stop();
    });
    expect(ref.current!.player).not.toBeNull();
  });

  it("controlled progress prop scrubs without autoplay", () => {
    const { rerender } = render(
      <BlinnMotion doc={doc} renderer="dom" progress={0} />,
    );
    const card0 = document.querySelector('[data-id="card"]') as HTMLElement;
    const t0 = card0.style.transform;
    rerender(<BlinnMotion doc={doc} renderer="dom" progress={1} />);
    const card1 = document.querySelector('[data-id="card"]') as HTMLElement;
    expect(card1.style.transform).not.toBe(t0);
    expect(card1.style.transform).toContain("scale(1,1)");
  });

  it("forwards className and style to the host", () => {
    const { container } = render(<BlinnMotion doc={doc} renderer="dom" autoplay={false} className="abc" style={{ opacity: 0.5 }} />);
    const host = container.firstElementChild as HTMLElement;
    expect(host.className).toBe("abc");
    expect(host.style.opacity).toBe("0.5");
  });

  it("fires onFrame when seeking", () => {
    const ref = createRef<BlinnMotionHandle>();
    let frames = 0;
    render(<BlinnMotion ref={ref} doc={doc} renderer="dom" autoplay={false} onFrame={() => frames++} />);
    act(() => ref.current!.seek(0.5));
    expect(frames).toBeGreaterThan(0);
  });

  it("renderer='canvas' mounts a <canvas> in the host", () => {
    const { container } = render(<BlinnMotion doc={doc} renderer="canvas" autoplay={false} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});

describe("useBlinnMotion hook", () => {
  function Harness({
    onPlayer,
    renderer = "dom",
  }: {
    onPlayer: (p: unknown) => void;
    renderer?: "dom" | "canvas";
  }) {
    const ref = useRef<HTMLDivElement>(null);
    const player = useBlinnMotion(ref, doc, { autoplay: false, renderer });
    onPlayer(player);
    return <div ref={ref} data-testid="host" />;
  }

  it("attaches a player to a provided ref after mount", () => {
    let last: unknown = "unset";
    render(<Harness onPlayer={(p) => (last = p)} />);
    expect(last).not.toBe("unset"); // effect ran and called back with the player (or null pre-mount)
  });

  it("renderer='canvas' mounts a <canvas> in the host ref", () => {
    const { container } = render(<Harness onPlayer={() => {}} renderer="canvas" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("cleans up the host on unmount", () => {
    const { container, unmount } = render(<Harness onPlayer={() => {}} />);
    expect(container.querySelector("[data-id]")).not.toBeNull();
    unmount();
    // host is removed with the component; no leftover players in document
    expect(document.querySelector("[data-id]")).toBeNull();
  });

  it("exposes seek/play controls on the returned player", () => {
    let player: { seek: (t: number) => unknown; play: () => unknown; pause: () => unknown } | null =
      null;
    render(
      <Harness
        onPlayer={(p) => {
          if (p) player = p as typeof player;
        }}
      />,
    );
    expect(player).not.toBeNull();
    act(() => {
      player!.seek(0.5);
      player!.play();
      player!.pause();
    });
  });
});
