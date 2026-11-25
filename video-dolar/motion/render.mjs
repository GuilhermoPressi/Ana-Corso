// Renderiza um componente do kit em PNG com alfa (determinístico via seek(t)).
// Uso: node motion/render.mjs <componente> '<props JSON>' <saida_dir> [--fps 30] [--t 1.2,2.0] [--fundo arquivo.png]
//  sem --t: renderiza a sequência inteira (0..dur) em <saida_dir>/%05d.png
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const __dir = path.dirname(fileURLToPath(import.meta.url));
const [, , comp, propsJson, outDir, ...rest] = process.argv;
const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const fps = Number(arg("--fps", 30));
const ts = arg("--t", null);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(__dir, "kit", "kit.html"));
await page.evaluate(() => window.pronto);
const dur = await page.evaluate(([c, p]) => window.monta(c, p), [comp, JSON.parse(propsJson)]);
const tempos = ts ? ts.split(",").map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
let i = 0;
for (const t of tempos) {
  await page.evaluate((tt) => window.seek(tt), t);
  const nome = ts ? `${comp}_${t.toFixed(2)}.png` : String(i).padStart(5, "0") + ".png";
  await page.screenshot({ path: path.join(outDir, nome), omitBackground: true });
  i++;
}
await browser.close();
console.log(JSON.stringify({ comp, dur, quadros: tempos.length }));
