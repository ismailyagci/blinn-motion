/**
 * Pure mapping from a resolved {@link RenderNode} to a React Native style object.
 *
 * No RN import at runtime — only the `ViewStyle` *type* (erased by the compiler),
 * so this is testable in plain node. The engine has already resolved every
 * transform/colour to a final value; here we just translate the names:
 *
 *   x/y        → left/top (absolute positioning)
 *   translate  → transform translateX/translateY
 *   rotation   → transform rotate "<deg>deg"
 *   scaleX/Y   → transform scaleX/scaleY
 *   fill       → backgroundColor (solid; linear falls back to its first stop)
 *   cornerRad  → borderRadius / per-corner radii
 *   stroke     → borderWidth + borderColor
 *
 * NOTE on anchors: RN applies transforms around the view's *centre*. The engine's
 * anchor can be off-centre (e.g. text uses {x:0}). We cannot reproduce an
 * arbitrary transform origin without a measured layout, so anchor handling here
 * is approximate (centre). For the common {x:0.5,y:0.5} case it is exact.
 */
import { rgbaToCss, type RenderNode } from "@fottie/core";
import type { ViewStyle } from "react-native";

/** The style object {@link nodeToTransform} produces. */
export type FottieNodeStyle = ViewStyle;

export function nodeToTransform(node: RenderNode): FottieNodeStyle {
  const style: FottieNodeStyle = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    opacity: node.opacity,
    // Order matters: translate → rotate → scale (matches the engine + other adapters).
    transform: [
      { translateX: node.translateX },
      { translateY: node.translateY },
      { rotate: `${node.rotation}deg` },
      { scaleX: node.scaleX },
      { scaleY: node.scaleY },
    ],
  };

  // Background colour from the fill.
  const fill = node.fill;
  if (fill) {
    if (fill.type === "solid") {
      style.backgroundColor = rgbaToCss(fill.color);
    } else if (fill.type === "linear" && fill.stops.length > 0) {
      // TODO: react-native-svg / expo-linear-gradient for real gradients.
      // v1 falls back to the first stop's colour so the box is at least tinted.
      style.backgroundColor = rgbaToCss(fill.stops[0]!.color);
    }
    // image fills are handled by <Image> nodes, not here.
  }

  // Corner radii: collapse to a single radius when uniform, else per-corner.
  const [tl, tr, br, bl] = node.cornerRadius;
  if (tl || tr || br || bl) {
    if (tl === tr && tr === br && br === bl) {
      style.borderRadius = tl;
    } else {
      style.borderTopLeftRadius = tl;
      style.borderTopRightRadius = tr;
      style.borderBottomRightRadius = br;
      style.borderBottomLeftRadius = bl;
    }
  }

  // Stroke → border (per-side when the four weights differ).
  if (node.stroke && (node.stroke.weight > 0 || node.stroke.sides)) {
    style.borderColor = rgbaToCss(node.stroke.color);
    if (node.stroke.sides) {
      const [t, r, b, l] = node.stroke.sides;
      style.borderTopWidth = t;
      style.borderRightWidth = r;
      style.borderBottomWidth = b;
      style.borderLeftWidth = l;
    } else {
      style.borderWidth = node.stroke.weight;
    }
  }

  return style;
}
