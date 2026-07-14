/**
 * `<BlinnMotionView doc={...} />` — plays a MotionDoc with native React Native views.
 *
 * Each frame the engine resolves the doc into a {@link RenderTree}; we render
 * that tree into nested <View>s (with <Text> for text and <Image> for image
 * nodes). Children are nested inside their parent View so RN's transform
 * inheritance matches the engine's parent-local coordinate model.
 *
 * v1 limitations: linear gradients and vector/polygon paths render the solid
 * fallback colour (see {@link nodeToTransform}); anchors are centre-approximate.
 */
import { forwardRef, useImperativeHandle, type ReactElement } from "react";
import { View, Text, Image, type ViewStyle } from "react-native";
import { parseColor, rgbaToCss, type MotionDoc, type RenderNode } from "@blinn-motion/core";
import { nodeToTransform } from "./style.js";
import {
  usePlayer,
  type BlinnMotionControls,
  type BlinnMotionPlaybackOptions,
} from "./player.js";

/** The imperative handle exposed via a ref on <BlinnMotionView/>. */
export type BlinnMotionHandle = BlinnMotionControls;

export interface BlinnMotionViewProps extends BlinnMotionPlaybackOptions {
  /** The MotionDoc to play. */
  doc: MotionDoc;
  /** Extra style merged onto the root stage View. */
  style?: ViewStyle | ViewStyle[];
}

/** Render one resolved node (and its children) into native views. */
function renderNode(node: RenderNode): ReactElement {
  const style = nodeToTransform(node);

  // Text node → a <Text> inside the transformed box.
  if (node.type === "text" && node.text) {
    const t = node.text;
    return (
      <View key={node.id} style={style}>
        <Text
          style={{
            color: rgbaToCss(t.color),
            fontSize: t.fontSize ?? 16,
            fontWeight: t.fontWeight != null ? String(t.fontWeight) : "400",
            fontFamily: t.fontFamily,
            textAlign: t.align ?? "left",
            letterSpacing: t.letterSpacing,
            lineHeight:
              t.lineHeight != null && t.fontSize != null ? t.lineHeight * t.fontSize : undefined,
          }}
        >
          {t.characters}
        </Text>
      </View>
    );
  }

  // Image node → an <Image> carrying the transformed box style.
  if (node.type === "image" && node.image) {
    return <Image key={node.id} source={{ uri: node.image }} style={style} />;
  }

  // Everything else → a <View> with children nested so transforms inherit.
  // TODO: react-native-svg / expo-linear-gradient for gradients & paths.
  return (
    <View key={node.id} style={style}>
      {node.children.map((c) => renderNode(c))}
    </View>
  );
}

export const BlinnMotionView = forwardRef<BlinnMotionHandle, BlinnMotionViewProps>(function BlinnMotionView(
  { doc, loop, autoplay, rate, onFrame, style },
  ref,
) {
  const { tree, controls } = usePlayer(doc, { loop, autoplay, rate, onFrame });

  useImperativeHandle(ref, () => controls, [controls]);

  const { width, height, background } = tree.stage;
  const stageStyle: ViewStyle = {
    position: "relative",
    overflow: "hidden",
    width,
    height,
    backgroundColor: background ? rgbaToCss(parseColor(background)) : undefined,
  };

  // RN accepts an array of styles; the caller's style wins (applied last).
  const rootStyle: ViewStyle | ViewStyle[] = style == null ? stageStyle : [stageStyle, style].flat();

  return <View style={rootStyle}>{tree.nodes.map((n) => renderNode(n))}</View>;
});
