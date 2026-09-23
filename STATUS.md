# STATUS — pi-title-glyphs

- **Phase:** 0.2.0 staged (cwd by default + title re-assertion after pi core stomps); npm 0.1.1 was the last published release
- **Last change:** 2026-09-23 — cwd on by default (`PI_TITLE_GLYPHS_CWD=0` to hide) + `session_info_changed`/`session_shutdown` handlers with one-shot unref'd 500 ms re-assertion; diagnosis proven: extension loads clean on pi 0.87.1 (SDK probe, 0 errors) and tool events arrive with full args (print-mode probe on woof smaug-mini); "title dead" = pi core's `Pi - <session> - <cwd>` stomp at bind/reload/naming, unchanged since 0.70.3
- **State:** tests 13/13 · v0.2.0 committed, NOT published (publish = Crow's 2FA path; a fresh publish also forces gallery re-indexing)
- **Next step:** Crow live-checks the new title (cwd visible, tool text during work, glyph title survives session auto-naming) → then `npm publish` v0.2.0 + tag
- **Deep records:** memory `pi-title-glyphs` (gallery root cause + fix, publish 404 signature) · `RELEASE.md` (v0.1.1 worksheet)
