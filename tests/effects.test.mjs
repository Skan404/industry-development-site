import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { URL } from "node:url";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(new URL("../src/scripts/effects.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function environment({ kind = "pixels", reduced = false, touch = false } = {}) {
  let now = 0,
    nextId = 0,
    contexts = 0,
    draws = 0;
  const frames = new Map(),
    listeners = new Map(),
    canvasListeners = new Map();
  const media = {
    reduced: {
      matches: reduced,
      addEventListener: (_, fn) => listeners.set("reduced", fn),
    },
    touch: {
      matches: touch,
      addEventListener: (_, fn) => listeners.set("touch", fn),
    },
  };
  const ctx = {
    setTransform() {},
    clearRect() {
      draws++;
    },
    fillRect() {},
    strokeRect() {},
  };
  const canvas = {
    clientWidth: 500,
    clientHeight: 500,
    width: 0,
    height: 0,
    getContext(type) {
      contexts++;
      return type === "2d" ? ctx : null;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    addEventListener: (name, fn) => canvasListeners.set(name, fn),
  };
  const host = { dataset: { effect: kind }, querySelector: () => canvas };
  const document = {
    hidden: false,
    querySelectorAll: (selector) =>
      selector === "[data-effect]" ? [host] : [],
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  let intersect;
  const sandbox = {
    exports: {},
    document,
    performance: { now: () => now },
    devicePixelRatio: 2,
    matchMedia: (query) =>
      query.includes("reduced") ? media.reduced : media.touch,
    requestAnimationFrame: (fn) => {
      frames.set(++nextId, fn);
      return nextId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class {
      constructor(fn) {
        intersect = fn;
      }
      observe() {}
    },
    ResizeObserver: class {
      observe() {}
    },
    window: { addEventListener: (name, fn) => listeners.set(name, fn) },
  };
  vm.runInNewContext(compiled, sandbox);
  sandbox.exports.initEffects();
  return {
    host,
    canvas,
    media,
    document,
    frames,
    get contexts() {
      return contexts;
    },
    get draws() {
      return draws;
    },
    visible(value) {
      intersect([{ isIntersecting: value }]);
    },
    event(name) {
      listeners.get(name)?.();
    },
    pointer() {
      listeners.get("pointermove")?.({
        clientX: 100,
        clientY: 100,
        pointerType: "mouse",
        type: "pointermove",
      });
    },
    tick(time) {
      now = time;
      const active = [...frames.values()];
      frames.clear();
      active.forEach((fn) => fn(time));
    },
  };
}

test("offscreen effects allocate no renderer; visible effects start and stop outside viewport", () => {
  const env = environment();
  assert.equal(env.contexts, 0);
  env.visible(true);
  env.tick(40);
  assert.equal(env.contexts, 1);
  assert.equal(env.host.dataset.running, "true");
  assert.equal(env.canvas.width, 625, "DPR is capped");
  env.visible(false);
  assert.equal(env.frames.size, 0);
  const before = env.draws;
  env.tick(100);
  assert.equal(env.draws, before);
  env.visible(true);
  env.tick(150);
  assert.equal(env.host.dataset.running, "true");
});

test("reduced motion and coarse pointer use static background without creating canvas contexts", () => {
  for (const settings of [{ reduced: true }, { touch: true }]) {
    const env = environment(settings);
    env.visible(true);
    env.tick(40);
    env.pointer();
    assert.equal(env.contexts, 0);
    assert.equal(env.frames.size, 0);
  }
});

test("changing reduced motion while running cancels work and can resume safely", () => {
  const env = environment();
  env.visible(true);
  env.tick(40);
  env.media.reduced.matches = true;
  env.event("reduced");
  assert.equal(env.frames.size, 0);
  assert.equal(env.host.dataset.running, "false");
  env.media.reduced.matches = false;
  env.event("reduced");
  env.tick(80);
  assert.equal(env.host.dataset.running, "true");
  assert.equal(env.contexts, 1);
});

test("hidden browser tab and pagehide stop rendering; pageshow resumes", () => {
  const env = environment();
  env.visible(true);
  env.tick(40);
  env.document.hidden = true;
  env.event("visibilitychange");
  assert.equal(env.frames.size, 0);
  env.document.hidden = false;
  env.event("visibilitychange");
  env.tick(80);
  assert.ok(env.frames.size > 0);
  env.event("pagehide");
  assert.equal(env.frames.size, 0);
  env.event("pageshow");
  env.tick(120);
  assert.equal(env.host.dataset.running, "true");
});

test("unavailable WebGL leaves fallback visible and does not schedule animation", () => {
  const env = environment({ kind: "rays" });
  env.visible(true);
  env.tick(40);
  assert.equal(env.host.dataset.fallback, "true");
  assert.notEqual(env.host.dataset.ready, "true");
  assert.equal(env.frames.size, 0);
});

test("Cursor Grid wakes on pointer input, then sleeps after the trail fades", () => {
  const env = environment({ kind: "grid" });
  env.visible(true);
  env.tick(40);
  assert.equal(env.frames.size, 0);
  env.pointer();
  env.tick(80);
  assert.equal(env.host.dataset.running, "true");
  env.tick(1050);
  assert.equal(env.frames.size, 0);
  assert.equal(env.host.dataset.running, "false");
});
