/**
 * pi-title-glyphs — latest user request with a live status glyph.
 *
 * Local customization: title text changes only with a new user request.
 * Tools, dialogs and external badges leave the request visible throughout a run.
 * Reloading or resuming restores it from the active session branch.
 *
 *   ⏳ · 修复字幕导入     working
 *   ❗ · 修复字幕导入     waiting for input
 *   🔵 · 修复字幕导入     finished in the background, unread
 *   ✓ · 修复字幕导入      finished and viewed
 *
 * Optional config:
 *   PI_TITLE_GLYPHS_CWD=1              include the project directory name
 *   PI_TITLE_GLYPHS_STATUS_FILE=<path> external status badge file
 *
 * An external writer can add a glyph with optional expiry:
 *   { "emoji": "🔓", "expiresAt": 1789200000000 }
 * The default file is `<agent-dir>/extension-data/pi-title-glyphs/status-<pid>.json`.
 * Missing, unreadable, malformed or expired badges are ignored.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import * as path from "node:path";
import { externalBadge, oneLine, renderTitle } from "./format.ts";
import { observeTerminalFocus } from "./focus.ts";

/**
 * Where the external status badge lives — **per session**, keyed by the pi process id,
 * because badge state ("you are #2 in line") belongs to one session and must never leak
 * into another session's title. An extension running inside pi writes the file for its
 * own session with the same `process.pid` this reads. PI_TITLE_GLYPHS_STATUS_FILE
 * overrides the whole path, for a writer outside the process.
 */
function statusFile(): string {
  return (
    process.env.PI_TITLE_GLYPHS_STATUS_FILE ??
    path.join(getAgentDir(), "extension-data", "pi-title-glyphs", `status-${process.pid}.json`)
  );
}

// ------------------------------------------------------------------ main ---
export default function (pi: ExtensionAPI) {
  type State = "working" | "needs-you" | "resting";

  let state: State = "resting";
  let unread = false;
  let focused = true; // Interactive startup is visible; focus events take over.
  let stopObservingFocus: (() => void) | undefined;
  let cwdName = "";
  let lastPrompt: string | undefined;
  let ctxRef: ExtensionContext | undefined;

  function render() {
    if (!ctxRef) return;
    ctxRef.ui.setTitle(
      renderTitle({ state, unread, cwdName, lastPrompt, badge: externalBadge(statusFile()) }),
    );
  }

  function noteCtx(ctx: ExtensionContext) {
    ctxRef = ctx;
    cwdName = path.basename(ctx.cwd);
  }

  function restorePrompt(ctx: ExtensionContext) {
    lastPrompt = undefined;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "message" || entry.message.role !== "user") continue;
      const content = entry.message.content;
      const text = typeof content === "string"
        ? content
        : content.filter((part) => part.type === "text").map((part) => part.text).join(" ");
      const prompt = oneLine(text);
      if (prompt) lastPrompt = prompt;
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    noteCtx(ctx);
    state = "resting";
    unread = false;
    restorePrompt(ctx);

    stopObservingFocus?.();
    stopObservingFocus = undefined;
    if (ctx.mode === "tui" && process.stdin.isTTY) {
      stopObservingFocus = observeTerminalFocus((visible) => {
        focused = visible;
        if (visible && unread) {
          unread = false;
          render();
        }
      });
    }
    render();
  });

  pi.on("session_shutdown", async () => {
    stopObservingFocus?.();
    stopObservingFocus = undefined;
    ctxRef = undefined;
  });

  pi.on("session_tree", async (_event, ctx) => {
    noteCtx(ctx);
    restorePrompt(ctx);
    render();
  });

  pi.on("model_select", async (_event, ctx) => {
    noteCtx(ctx);
    render();
  });

  pi.on("input", async (event, ctx) => {
    noteCtx(ctx);
    if (event.source === "extension") return; // injected messages aren't your requests
    if (event.source === "interactive") {
      focused = true;
      unread = false;
    }
    const t = event.text ? oneLine(event.text) : "";
    if (t) lastPrompt = t;
    render();
  });

  pi.on("agent_start", async (_event, ctx) => {
    noteCtx(ctx);
    state = "working";
    unread = false;
    render();
  });

  pi.on("tool_execution_start", async (_event, ctx) => {
    noteCtx(ctx);
    render();
  });

  pi.on("ui_prompt_start", async (_event, ctx) => {
    noteCtx(ctx);
    state = "needs-you";
    render();
  });

  pi.on("ui_prompt_end", async (_event, ctx) => {
    noteCtx(ctx);
    state = "working"; // agent loop resumes; agent_settled flips to resting when truly done
    render();
  });

  pi.on("agent_settled", async (_event, ctx) => {
    noteCtx(ctx);
    state = "resting";
    unread = !focused;
    render();
  });
}
