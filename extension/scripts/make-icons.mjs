// Renders icons/icon.svg and icons/icon-off.svg to the PNG sizes Chrome needs.
// Run once after changing the SVGs (`npm run icons`); the PNGs are committed.
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const dir = new URL("../icons/", import.meta.url);
for (const name of ["icon", "icon-off"]) {
  const svg = readFileSync(new URL(`${name}.svg`, dir), "utf8");
  for (const size of [16, 32, 48, 128]) {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: size }, font: { loadSystemFonts: true } })
      .render()
      .asPng();
    writeFileSync(new URL(`${name}-${size}.png`, dir), png);
  }
}
console.log("icons written");
