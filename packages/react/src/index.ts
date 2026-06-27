/**
 * @fottie/react — React bindings for Fottie.
 *
 * - `<Fottie doc={...} renderer="dom|canvas" />` — drop-in component
 * - `useFottie(ref, doc, opts)` — hook for manual control
 *
 * Both backends share @fottie/core's render method.
 */
export { Fottie } from "./Fottie.js";
export type { FottieProps, FottieHandle, FottieRenderer, FottiePlayer } from "./Fottie.js";
export { useFottie, type UseFottieOptions } from "./useFottie.js";
