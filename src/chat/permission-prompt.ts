import { setIcon } from "obsidian";

export interface PermissionInfo {
  toolName: string;
  input: Record<string, unknown>;
  title?: string;
  displayName?: string;
  description?: string;
}

export type PermissionResult = "allow" | "deny" | "always";

interface PromptHandle {
  promise: Promise<PermissionResult>;
  cleanup: () => void;
}

/**
 * Renders an inline permission prompt card in the chat stream.
 * Returns a promise that resolves with the user's decision.
 */
export function showPermissionPrompt(
  container: HTMLElement,
  info: PermissionInfo,
): PromptHandle {
  let resolve: (result: PermissionResult) => void;
  const promise = new Promise<PermissionResult>((r) => { resolve = r; });

  const el = container.createDiv("ccd-permission");

  // Header
  const header = el.createDiv("ccd-permission-header");
  const icon = header.createSpan("ccd-permission-icon");
  setIcon(icon, "shield-alert");
  header.createSpan({ text: info.displayName ?? info.toolName, cls: "ccd-permission-title" });

  // Description
  if (info.description) {
    el.createEl("p", { text: info.description, cls: "ccd-permission-desc" });
  }

  // Input preview (collapsible JSON)
  if (Object.keys(info.input).length > 0) {
    const inputSection = el.createDiv("ccd-permission-input");
    const toggleBtn = inputSection.createSpan({ text: "Show input", cls: "ccd-permission-toggle" });
    const inputPre = inputSection.createEl("pre", { cls: "ccd-permission-json ccd-collapsed" });
    inputPre.textContent = JSON.stringify(info.input, null, 2);
    toggleBtn.addEventListener("click", () => {
      const isCollapsed = inputPre.hasClass("ccd-collapsed");
      inputPre.toggleClass("ccd-collapsed", !isCollapsed);
      toggleBtn.textContent = isCollapsed ? "Hide input" : "Show input";
    });
  }

  // Action buttons
  const actions = el.createDiv("ccd-permission-actions");

  const denyBtn = actions.createEl("button", { text: "Deny", cls: "ccd-perm-btn ccd-perm-deny" });
  denyBtn.addEventListener("click", () => { resolve!("deny"); cleanup(); });

  const allowBtn = actions.createEl("button", { text: "Allow", cls: "ccd-perm-btn ccd-perm-allow" });
  allowBtn.addEventListener("click", () => { resolve!("allow"); cleanup(); });

  const alwaysBtn = actions.createEl("button", { text: "Always allow", cls: "ccd-perm-btn ccd-perm-always" });
  alwaysBtn.addEventListener("click", () => { resolve!("always"); cleanup(); });

  function cleanup(): void {
    el.addClass("ccd-permission-resolved");
  }

  return { promise, cleanup: () => el.remove() };
}
