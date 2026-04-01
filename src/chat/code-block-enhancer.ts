/**
 * Post-processes rendered markdown to add language labels and copy buttons
 * to code fences.
 */
export function enhanceCodeBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll("pre > code");

  for (const codeEl of Array.from(codeBlocks)) {
    const pre = codeEl.parentElement;
    if (!pre || pre.hasClass("ccd-enhanced")) continue;
    pre.addClass("ccd-enhanced");

    // Extract language from class
    const lang = extractLanguage(codeEl);

    // Create header bar
    const header = document.createElement("div");
    header.className = "ccd-code-header";

    if (lang) {
      const langLabel = document.createElement("span");
      langLabel.className = "ccd-code-lang";
      langLabel.textContent = lang;
      header.appendChild(langLabel);
    }

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "ccd-code-copy";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      const text = codeEl.textContent ?? "";
      void navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      });
    });
    header.appendChild(copyBtn);

    pre.insertBefore(header, pre.firstChild);
  }
}

function extractLanguage(codeEl: Element): string | null {
  for (const cls of Array.from(codeEl.classList)) {
    if (cls.startsWith("language-")) {
      return cls.replace("language-", "");
    }
  }
  return null;
}
