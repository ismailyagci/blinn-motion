import { useEffect, useId, useState } from "react";
import { snippets, type StackId } from "./snippets";

type Props = { stack: StackId };

export function SnippetPanel({ stack }: Props) {
  const s = snippets[stack];
  const reactId = useId();
  const [copied, setCopied] = useState<"install" | "code" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async (which: "install" | "code") => {
    const text = which === "install" ? s.install : s.code;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="card snippet" data-snippet-root data-stack={s.id} aria-labelledby={reactId}>
      <div className="card-head">
        <h2 id={reactId}>Drop into your app</h2>
        <span className="card-meta">basic {s.title} integration</span>
      </div>
      <div className="card-body snippet-body">
        <p className="snippet-lede">
          Minimal setup for <code>{s.packageName}</code>. Copy, install, import your{" "}
          <code>MotionDoc</code> — no need to leave this page for the basics.
        </p>
        <div className="snippet-install">
          <span className="console-label">Install</span>
          <div className="snippet-install-row">
            <code className="snippet-install-cmd mono">{s.install}</code>
            <button
              type="button"
              className={`btn btn-ghost snippet-copy${copied === "install" ? " copied" : ""}`}
              onClick={() => void copy("install")}
            >
              {copied === "install" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="snippet-code-wrap">
          <div className="snippet-code-bar">
            <span className="mono snippet-file">{s.file}</span>
            <button
              type="button"
              className={`btn btn-ghost snippet-copy${copied === "code" ? " copied" : ""}`}
              onClick={() => void copy("code")}
            >
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
          </div>
          <pre className="snippet-pre mono">
            <code>{s.code}</code>
          </pre>
        </div>
        <div className="snippet-actions">
          <a className="btn btn-primary" href={s.docs} target="_blank" rel="noreferrer">
            Full adapter docs ↗
          </a>
          <a className="btn btn-ghost" href="https://docs.blinnmotion.com/quickstart" target="_blank" rel="noreferrer">
            Quickstart ↗
          </a>
          <a
            className="btn btn-ghost"
            href="https://docs.blinnmotion.com/concepts/motiondoc"
            target="_blank"
            rel="noreferrer"
          >
            MotionDoc ↗
          </a>
        </div>
      </div>
    </section>
  );
}
