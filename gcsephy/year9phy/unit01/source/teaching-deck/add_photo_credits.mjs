import { PresentationFile, Presentation } from "@oai/artifact-tool";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const workspace = new URL("./", import.meta.url);
const inputPath = new URL("../../Work Like a Physicist - Year 9 Teaching Deck.pptx", workspace);
const outputPath = new URL("../../Work Like a Physicist - Year 9 Teaching Deck.pptx", workspace);

const credits = new Map([
  [4, "Photo: MhieR / Wikimedia Commons (CC BY-SA 3.0)"],
  [37, "Photo: Chris Gilbert / British Antarctic Survey"],
  [46, "Photo: NASA/JPL-Caltech/ASU/MSSS"],
  [53, "Photo: Caltech/MIT/LIGO Lab"],
]);

const presentation = await PresentationFile.importPptx(fs.readFileSync(inputPath));

for (const [slideNumber, label] of credits) {
  const slide = presentation.slides.getItem(slideNumber - 1);
  let credit = slide.shapes.items.find((shape) => shape.name === "Photo credit");

  if (!credit) {
    credit = slide.shapes.add({
      geometry: "textbox",
      name: "Photo credit",
      position: { left: 816, top: 516, width: 403.2, height: 20 },
      fill: "none",
      line: { fill: "none", width: 0 },
    });
  }

  credit.position = { left: 816, top: 516, width: 403.2, height: 20 };
  credit.text = label;
  credit.text.style = {
    typeface: "Arial",
    fontSize: 11,
    color: "#8FA8C4",
    alignment: "right",
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    wrap: "none",
    insets: { top: 0, right: 2, bottom: 0, left: 2 },
  };
}

const check = await presentation.inspect({
  kind: "textbox",
  search: "Photo:",
  include: "shape,text,position",
  maxChars: 4000,
});
console.log(check.ndjson);

const renderDir = new URL("./rendered/", workspace);
fs.mkdirSync(renderDir, { recursive: true });
for (let index = 0; index < presentation.slides.items.length; index += 1) {
  const slide = presentation.slides.getItem(index);
  const image = await presentation.export({ slide, format: "png", scale: 1 });
  fs.writeFileSync(
    new URL(`slide-${String(index + 1).padStart(2, "0")}.png`, renderDir),
    Buffer.from(await image.arrayBuffer()),
  );
}

const blob = await PresentationFile.exportPptx(presentation);
await blob.save(fileURLToPath(outputPath));
console.log(`Saved ${fileURLToPath(outputPath)}`);
