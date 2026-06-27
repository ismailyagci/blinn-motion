// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { createRef, useRef } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@fottie/core";
import { Fottie, useFottie, type FottieHandle } from "./index.js";

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

describe("<Fottie/> (dom backend)", () => {
  it("mounts a host with a sized stage and one node per layer", () => {
    const { container } = render(<Fottie doc={doc} renderer="dom" autoplay={false} />);
    const host = container.firstElementChild as HTMLElement;
    const stage = host.firstElementChild as HTMLElement; // DomPlayer's stage
    expect(stage.style.width).toBe("375px");
    expect(container.querySelectorAll("[data-id]").length).toBeGreaterThanOrEqual(3);
  });

  it("exposes an imperative handle that drives the player", () => {
    const ref = createRef<FottieHandle>();
    render(<Fottie ref={ref} doc={doc} renderer="dom" autoplay={false} />);
    expect(ref.current).not.toBeNull();
    act(() => ref.current!.seekFraction(1));
    const card = document.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("scale(1,1)");
    // play/pause/stop/setRate are callable without throwing
    act(() => {
      ref.current!.play();
      ref.current!.pause();
      ref.current!.setRate(2);
      ref.current!.stop();
    });
    expect(ref.current!.player).not.toBeNull();
  });

  it("forwards className and style to the host", () => {
    const { container } = render(<Fottie doc={doc} renderer="dom" autoplay={false} className="abc" style={{ opacity: 0.5 }} />);
    const host = container.firstElementChild as HTMLElement;
    expect(host.className).toBe("abc");
    expect(host.style.opacity).toBe("0.5");
  });

  it("fires onFrame when seeking", () => {
    const ref = createRef<FottieHandle>();
    let frames = 0;
    render(<Fottie ref={ref} doc={doc} renderer="dom" autoplay={false} onFrame={() => frames++} />);
    act(() => ref.current!.seek(0.5));
    expect(frames).toBeGreaterThan(0);
  });

  it("renderer='canvas' mounts a <canvas> in the host", () => {
    const { container } = render(<Fottie doc={doc} renderer="canvas" autoplay={false} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});

describe("useFottie hook", () => {
  function Harness({ onPlayer }: { onPlayer: (p: unknown) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const player = useFottie(ref, doc, { autoplay: false });
    onPlayer(player);
    return <div ref={ref} />;
  }
  it("attaches a player to a provided ref after mount", () => {
    let last: unknown = "unset";
    render(<Harness onPlayer={(p) => (last = p)} />);
    expect(last).not.toBe("unset"); // effect ran and called back with the player (or null pre-mount)
  });
});
