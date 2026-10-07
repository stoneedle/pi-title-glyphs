# Contributing

This fork optimizes terminal-tab recognition: the latest user request stays visible, while a compact status prefix communicates working, waiting, read or unread state.

## Layout

| File | Responsibility |
|---|---|
| `src/index.ts` | Pi event wiring, session-local state and active-branch prompt restoration |
| `src/format.ts` | Title rendering and the optional external badge contract |
| `src/focus.ts` | Observe existing focus reports through Pi's input parser, with listener cleanup |
| `test/format.test.ts` | Public rendering and badge result contracts |

## Verify

```bash
npm test
npm pack --dry-run
pi -e ./src/index.ts
```

In the temporary Pi session, send a request that runs tools and confirm that only the state prefix changes. Send another request and confirm that the text updates. Reload and resume the session to check prompt restoration. With terminal focus reporting enabled, finish a run in a background tab and check that `🔵` clears when the tab becomes focused.

Use Pi's normal extension loader and a real session file when checking event wiring and session restoration. The renderer tests run without installing dependencies. Test data and terminal listeners must be cleaned up after verification.

## Design

The prompt owns the title text; tools, dialogs and badges affect only the status prefix. Keep provider selection and tool progress out of title text. Use Pi's `ctx.ui.setTitle` and existing terminal input parser. Keep the extension local and event-driven, with no LLM calls, network requests, tools, commands or persistent state.
