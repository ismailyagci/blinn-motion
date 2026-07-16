import { snippets, type StackId, type Snippet } from "./snippets";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full lab card HTML for a stack snippet (dark lab chrome). */
export function renderSnippetSection(stack: StackId): string {
  const s = snippets[stack];
  return `
<section class="card snippet" data-snippet-root data-stack="${s.id}">
  <div class="card-head">
    <h2>Drop into your app</h2>
    <span class="card-meta">basic ${escapeHtml(s.title)} integration</span>
  </div>
  <div class="card-body snippet-body">
    <p class="snippet-lede">
      Minimal setup for <code>${escapeHtml(s.packageName)}</code>.
      Copy, install, import your <code>MotionDoc</code> — no need to leave this page for the basics.
    </p>
    <div class="snippet-install">
      <span class="console-label">Install</span>
      <div class="snippet-install-row">
        <code class="snippet-install-cmd mono" data-copy-text>${escapeHtml(s.install)}</code>
        <button type="button" class="btn btn-ghost snippet-copy" data-copy-snippet data-copy-source="install">Copy</button>
      </div>
    </div>
    <div class="snippet-code-wrap">
      <div class="snippet-code-bar">
        <span class="mono snippet-file">${escapeHtml(s.file)}</span>
        <button type="button" class="btn btn-ghost snippet-copy" data-copy-snippet data-copy-source="code">Copy code</button>
      </div>
      <pre class="snippet-pre mono"><code data-snippet-code>${escapeHtml(s.code)}</code></pre>
    </div>
    <div class="snippet-actions">
      <a class="btn btn-primary" href="${escapeHtml(s.docs)}" target="_blank" rel="noreferrer">Full adapter docs ↗</a>
      <a class="btn btn-ghost" href="https://docs.blinnmotion.com/quickstart" target="_blank" rel="noreferrer">Quickstart ↗</a>
      <a class="btn btn-ghost" href="https://docs.blinnmotion.com/concepts/motiondoc" target="_blank" rel="noreferrer">MotionDoc ↗</a>
    </div>
  </div>
</section>`.trim();
}

export function getSnippet(stack: StackId): Snippet {
  return snippets[stack];
}

/** Wire copy buttons inside a root (document or a host element). */
export function bindSnippetCopy(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-snippet-root]").forEach((panel) => {
    const stack = panel.getAttribute("data-stack") as StackId | null;
    const snip = stack ? snippets[stack] : null;
    panel.querySelectorAll<HTMLButtonElement>("[data-copy-snippet]").forEach((btn) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async () => {
        const source = btn.getAttribute("data-copy-source");
        let text = "";
        if (source === "install" && snip) text = snip.install;
        else if (source === "code" && snip) text = snip.code;
        else {
          const cmd = panel.querySelector("[data-copy-text]");
          text = cmd?.textContent?.trim() ?? "";
        }
        try {
          await navigator.clipboard.writeText(text);
          const prev = btn.textContent;
          btn.textContent = "Copied";
          btn.classList.add("copied");
          window.setTimeout(() => {
            btn.textContent = prev;
            btn.classList.remove("copied");
          }, 1400);
        } catch {
          btn.textContent = "Failed";
        }
      });
    });
  });
}

/** Mount snippet HTML into a container and bind copy. */
export function mountSnippetPanel(host: HTMLElement, stack: StackId): void {
  host.innerHTML = renderSnippetSection(stack);
  bindSnippetCopy(host);
}
