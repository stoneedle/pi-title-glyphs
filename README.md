# pi-title-glyphs

A fork of [t0mj/pi-title-glyphs](https://github.com/t0mj/pi-title-glyphs) that keeps each terminal tab identifiable by your **latest request**. The request stays visible while tools run, dialogs open and the agent finishes. Only a new user request changes the title text.

```text
⏳ · Fix subtitle import     working
❗ · Fix subtitle import     waiting for your input
🔵 · Fix subtitle import     finished in the background, unread
✓ · Fix subtitle import      finished and viewed
```

The status glyph changes independently of the request. Provider icons are omitted to leave more room for the task. Titles are derived locally from input and Pi events, with no LLM calls or network requests.

## Install

Requires Node.js 22.19.0 or newer and Pi 1.0.4 or newer.

```bash
pi install git:github.com/stoneedle/pi-title-glyphs
```

Then restart Pi or run `/reload`. Keep one title extension installed: move any standalone copy at `~/.pi/agent/extensions/pi-title-glyphs/` out of the extension directory before installing this package.

For development, load a checkout instead:

```bash
git clone https://github.com/stoneedle/pi-title-glyphs.git
cd pi-title-glyphs
pi install .
```

## Title behavior

| Glyph | State | Event |
|---|---|---|
| `⏳` | Working | `agent_start`, `ui_prompt_end` |
| `❗` | Waiting for input | `ui_prompt_start` |
| `🔵` | Finished while unfocused | `agent_settled` |
| `✓` | Finished and viewed | `agent_settled` while focused; focus-in or user input clears unread |

Interactive and RPC user input update the request. Extension-injected input leaves it unchanged. Reloading, resuming or navigating the session tree restores the latest non-empty user text from the active branch. Long requests are truncated within `TITLE_BUDGET` in [`src/format.ts`](src/format.ts), with the same text budget for each status glyph.

Unread tracking observes Pi's existing terminal focus reports without consuming input, changing raw mode or emitting terminal escapes. It works when the terminal and Pi mode provide focus reports; typing also acknowledges completion. Terminal title rendering uses Pi's `ctx.ui.setTitle`. RPC and print modes provide no terminal title surface.

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `PI_TITLE_GLYPHS_CWD` | off | `1` / `on` / `true` adds the project directory name |
| `PI_TITLE_GLYPHS_STATUS_FILE` | `<agent-dir>/extension-data/pi-title-glyphs/status-<pid>.json` | Optional external badge file |

An external writer can add a status glyph before the normal state indicator:

```json
{ "emoji": "🔓", "expiresAt": 1789200000000 }
```

`emoji` is required, flattened to one line and capped at eight JavaScript string units. `expiresAt` is optional, in epoch milliseconds. Missing, unreadable, malformed or expired badges are ignored. The file is read at title-rendering events; this extension creates no files or watchers. A badge changes the prefix while the request remains the title text.

## Development

```bash
npm test
npm pack --dry-run
```

[`src/index.ts`](src/index.ts) owns event-driven state and prompt restoration. [`src/format.ts`](src/format.ts) owns rendering and badge parsing. [`src/focus.ts`](src/focus.ts) observes focus reports through Pi's input parser and releases its listener on shutdown. See [CONTRIBUTING.md](CONTRIBUTING.md) for loading and verification.

## License

MIT. Original extension by t0mj; fork customizations by stoneedle. See [LICENSE](LICENSE).
