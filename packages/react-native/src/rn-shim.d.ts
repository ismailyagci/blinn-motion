/**
 * Minimal ambient shim for `react-native`.
 *
 * `react-native` is a *peer* dependency — the host app installs it. We don't
 * install it inside the monorepo (it would drag in a whole native toolchain),
 * so we declare just the handful of exports this adapter touches. In a real
 * consumer app the genuine `react-native` types take precedence over this shim.
 *
 * Styles are intentionally loose (`Record<string, any>`): the engine emits final
 * numbers/strings and we hand them straight to RN, which does its own narrowing.
 */
declare module "react-native" {
  import type { ComponentType, ReactNode, Ref } from "react";

  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;

  export interface ViewProps {
    style?: ViewStyle | ViewStyle[] | null;
    children?: ReactNode;
    ref?: Ref<any>;
    [key: string]: any;
  }

  export interface TextProps {
    style?: TextStyle | TextStyle[] | null;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface ImageProps {
    style?: ImageStyle | ImageStyle[] | null;
    source?: { uri: string } | number;
    [key: string]: any;
  }

  export const View: ComponentType<ViewProps>;
  export const Text: ComponentType<TextProps>;
  export const Image: ComponentType<ImageProps>;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
    flatten(style?: any): any;
    absoluteFill: ViewStyle;
    hairlineWidth: number;
  };
}
