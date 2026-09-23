import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/theme.css"), "utf8");
const block = (selector: string) => {
  const body = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*oklch\(([^)]+)\)/g)].map((m) => [m[1], m[2]]));
};
function luminance(v: string) {
  const [l, c, h] = v.split("/")[0].trim().split(/\s+/).map(Number);
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, bl] = [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S].map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
const ratio = (x: string, y: string) => { const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };

const PAIRS: [string, string, number][] = [
  ["pr-text", "pr-bg", 4.5], ["pr-text", "pr-surface", 4.5], ["pr-text", "pr-surface-sunken", 4.5], ["pr-text", "pr-surface-hover", 4.5],
  ["pr-text-muted", "pr-bg", 4.5], ["pr-text-muted", "pr-surface", 4.5], ["pr-text-muted", "pr-surface-sunken", 4.5], ["pr-text-muted", "pr-surface-hover", 4.5],
  ["pr-accent-fg", "pr-accent", 4.5], ["pr-accent-fg", "pr-accent-hover", 4.5], ["pr-accent-fg", "pr-accent-active", 4.5],
  ["pr-accent-text", "pr-bg", 4.5], ["pr-accent-text", "pr-surface-sunken", 4.5], ["pr-accent-text", "pr-accent-subtle", 4.5], ["pr-text", "pr-accent-subtle", 4.5],
  ["pr-accent", "pr-bg", 3], ["pr-accent", "pr-surface-sunken", 3], ["pr-focus", "pr-bg", 3], ["pr-border-strong", "pr-bg", 3], ["pr-border-strong", "pr-surface-sunken", 3],
  ["pr-danger-text", "pr-bg", 4.5], ["pr-danger-text", "pr-surface-sunken", 4.5], ["pr-danger-text", "pr-danger-subtle", 4.5], ["pr-danger-on-solid", "pr-danger-solid", 4.5],
  ["pr-success-text", "pr-bg", 4.5], ["pr-success-text", "pr-success-subtle", 4.5], ["pr-success-on-solid", "pr-success-solid", 4.5], ["pr-success-solid", "pr-bg", 3],
  ["pr-warning-text", "pr-bg", 4.5], ["pr-warning-text", "pr-warning-subtle", 4.5], ["pr-info-text", "pr-bg", 4.5], ["pr-info-text", "pr-info-subtle", 4.5],
];

describe.each([[":root", "light"], ['[data-pr-theme="dark"]', "dark"]])("Ritmo tokens in %s (%s)", (selector) => {
  const light = block(":root");
  const tokens = { ...light, ...block(selector) };
  it.each(PAIRS)("%s on %s reaches %s:1", (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    const r = ratio(tokens[fg], tokens[bg]);
    expect(r, `${fg} on ${bg} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});
