/** Shared FAQ copy + JSON-LD for /faq and homepage schema */
export const faqs = [
  {
    question: "What is Blinn Motion?",
    answer:
      "Blinn Motion is the runtime for Figma Motion. It exports a Motion timeline to a portable JSON document called MotionDoc, then plays it with a pure-JS render engine — identical across DOM, Canvas, React, Vue, Svelte, Angular, Lit, and React Native.",
  },
  {
    question: "How do I export Figma Motion to production code?",
    answer:
      "Install the Blinn Motion Figma plugin, select your animated frame, export a MotionDoc JSON, then install the adapter for your stack (for example npm i @blinn-motion/react) and mount the document. No hand rebuild in CSS and no video bake.",
  },
  {
    question: "Is Blinn Motion a Lottie alternative?",
    answer:
      "For product UI motion that already lives in Figma, yes. Blinn keeps Figma as the source of truth with a sparse MotionDoc and a small player (~9 KB gzip core + DOM). Lottie is still a strong choice for After Effects illustration loops.",
  },
  {
    question: "Does Figma Motion export to React / CSS already?",
    answer:
      "Figma can copy CSS, JSON, or Motion-oriented snippets from Dev Mode. Blinn is different: one MotionDoc plays everywhere with seek, scrub, shared timing, and adapters for web and React Native — not a one-off code paste per frame.",
  },
  {
    question: "What is a MotionDoc?",
    answer:
      "MotionDoc is Blinn’s open, time-based animation document. It is small, readable JSON — inspectable, git-diffable, and versionable — produced by the Figma plugin or authored by hand for tests.",
  },
  {
    question: "Which frameworks does Blinn Motion support?",
    answer:
      "DOM, Canvas, React, Vue, Svelte, Angular, Lit, and React Native. Meta-frameworks use the same packages: Next.js with the React adapter, Astro islands with React or Lit, Expo with React Native.",
  },
  {
    question: "Is Blinn Motion free and open source?",
    answer:
      "Yes. The engine and adapters are MIT-licensed on GitHub under ismailyagci/blinn-motion, and packages publish under the @blinn-motion npm org.",
  },
  {
    question: "Can I scrub or drive motion from scroll?",
    answer:
      "Yes. Every adapter supports clock playback plus progress mode via setProgress(0…1) or a controlled progress prop — ideal for scroll-linked and gesture-driven UI motion.",
  },
] as const;

export function faqJsonLd(pageUrl = "https://blinnmotion.com/faq") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
    url: pageUrl,
  };
}
