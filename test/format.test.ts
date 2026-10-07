import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { externalBadge, renderTitle, TITLE_BUDGET } from "../src/format.ts";

const states = [
  { state: "working", unread: false, glyph: "⏳" },
  { state: "needs-you", unread: false, glyph: "❗" },
  { state: "resting", unread: false, glyph: "✓" },
  { state: "resting", unread: true, glyph: "🔵" },
] as const;

test("status changes preserve the user request, including with an external badge", () => {
  const lastPrompt = "Fix subtitle import";
  for (const { state, unread, glyph } of states) {
    assert.equal(renderTitle({ state, unread, lastPrompt }), `${glyph} · ${lastPrompt}`);
    assert.equal(renderTitle({ state, unread }), glyph);
    assert.equal(
      renderTitle({ state, unread, lastPrompt, badge: { emoji: "🔓" } }),
      `🔓 ${glyph} · ${lastPrompt}`,
    );
  }
});

test("long requests keep the same bounded text across status transitions", () => {
  const lastPrompt = "排查字幕渲染与同步问题".repeat(20);
  for (const badge of [undefined, { emoji: "🔓" }]) {
    const titles = states.map(({ state, unread }) => renderTitle({ state, unread, lastPrompt, badge }));
    assert.equal(new Set(titles.map((title) => title.split(" · ")[1])).size, 1);
    for (const title of titles) {
      assert.ok(title.length <= TITLE_BUDGET);
      assert.ok(title.endsWith("…"));
    }
  }
});

test("project name is opt-in and preserves the request", () => {
  const previous = process.env.PI_TITLE_GLYPHS_CWD;
  try {
    delete process.env.PI_TITLE_GLYPHS_CWD;
    assert.equal(renderTitle({ state: "resting", unread: false, cwdName: "myproj", lastPrompt: "Fix import" }), "✓ · Fix import");
    process.env.PI_TITLE_GLYPHS_CWD = "1";
    assert.equal(renderTitle({ state: "resting", unread: false, cwdName: "myproj", lastPrompt: "Fix import" }), "✓ myproj · Fix import");
  } finally {
    if (previous === undefined) delete process.env.PI_TITLE_GLYPHS_CWD;
    else process.env.PI_TITLE_GLYPHS_CWD = previous;
  }
});

test("badge files produce a glyph only when valid and unexpired", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptg-badge-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "badge.json");
  const read = (body: string) => {
    fs.writeFileSync(file, body);
    return externalBadge(file);
  };
  assert.equal(externalBadge(file), undefined);
  for (const body of ["{not json", "null", "{}", '{"emoji":5}']) {
    assert.equal(read(body), undefined);
  }
  assert.deepEqual(read('{"emoji":"🔓"}'), { emoji: "🔓" });
  assert.deepEqual(read(JSON.stringify({ emoji: "🔓", expiresAt: Date.now() + 60_000 })), { emoji: "🔓" });
  assert.equal(read(JSON.stringify({ emoji: "🔓", expiresAt: Date.now() - 1 })), undefined);
  assert.deepEqual(read(JSON.stringify({ emoji: "x".repeat(200) })), { emoji: "x".repeat(8) });
});
