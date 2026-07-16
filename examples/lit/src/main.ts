import "../../_shared/demo.css";
import { defineBlinnMotionElement } from "@blinn-motion/lit";

// Explicit registration so tree-shaking cannot drop the custom element definition.
defineBlinnMotionElement();

import "./demo-app";
