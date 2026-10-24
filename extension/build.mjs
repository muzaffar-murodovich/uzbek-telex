import { cpSync, mkdirSync, rmSync } from "node:fs";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(`${outdir}/icons`, { recursive: true });

const copyStatic = () => {
  cpSync("manifest.json", `${outdir}/manifest.json`);
  cpSync("static", outdir, { recursive: true });
  for (const name of ["icon", "icon-off"]) {
    for (const size of [16, 32, 48, 128]) {
      cpSync(`icons/${name}-${size}.png`, `${outdir}/icons/${name}-${size}.png`);
    }
  }
};

const options = {
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background/index.ts",
    popup: "src/popup/index.ts",
  },
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome110",
  charset: "utf8",
  legalComments: "none",
  logLevel: "info",
  plugins: [{ name: "copy-static", setup: (b) => b.onEnd(copyStatic) }],
};

if (watch) {
  await (await esbuild.context(options)).watch();
} else {
  await esbuild.build(options);
}
