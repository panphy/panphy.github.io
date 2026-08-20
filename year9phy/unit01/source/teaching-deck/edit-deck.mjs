import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspace = fileURLToPath(new URL("./", import.meta.url));
const starterPptx = path.join(workspace, "template-starter.pptx");
const finalPptx = path.resolve(workspace, "../../Work Like a Physicist - Year 9 Teaching Deck.pptx");
const renderDir = path.join(workspace, "final-render");
const layoutDir = path.join(workspace, "final-layout", "final");

async function bytes(file) {
  const buffer = await fs.readFile(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPptx));

const commonImageFrame = { left: 816, top: 225.6, width: 403.2, height: 288 };
const commonBodyFrame = { left: 59.52, top: 225.6, width: 710.4, height: 288 };

const cases = [
  {
    slide: 4,
    asset: path.join(workspace, "assets/real/opera-detector.jpg"),
    contentType: "image/jpeg",
    alt: "The OPERA neutrino detector in the Gran Sasso underground laboratory during construction",
    notes: [
      "[Sources]",
      "Case photo: OPERA detector during construction, November 2005. MhieR, CC BY-SA 3.0 / GFDL.",
      "https://commons.wikimedia.org/wiki/File:OPERA-Experiment-Nov2005.jpg",
      "Case background: https://en.wikipedia.org/wiki/OPERA_experiment",
      "[/Sources]",
    ].join("\n"),
  },
  {
    slide: 13,
    asset: path.join(workspace, "assets/generated/energy-drink-study.png"),
    contentType: "image/png",
    alt: "A realistic fictional school maths-test trial with unbranded energy drink cans",
    notes: [
      "[Sources]",
      "Visual: AI-generated fictional classroom scenario; no named people, school, company, or brand is depicted.",
      "Prompt summary: British secondary-school maths test, pupils with plain unbranded drink cans, adult researcher, documentary photography.",
      "[/Sources]",
    ].join("\n"),
  },
  {
    slide: 21,
    asset: path.join(workspace, "assets/generated/helmet-impact-test.png"),
    contentType: "image/png",
    alt: "A realistic fictional bicycle-helmet impact test with an instrumented headform and steel anvil",
    notes: [
      "[Sources]",
      "Visual: AI-generated fictional product-safety laboratory; no named person, laboratory, manufacturer, or brand is depicted.",
      "Prompt summary: instrumented headform, bicycle helmet, vertical drop rig, steel anvil and monitoring engineer.",
      "[/Sources]",
    ].join("\n"),
  },
  {
    slide: 29,
    asset: path.join(workspace, "assets/generated/stunt-ramp-test.png"),
    contentType: "image/png",
    alt: "A realistic fictional controlled stunt-car ramp test with engineers measuring speed and distance",
    notes: [
      "[Sources]",
      "Visual: AI-generated fictional stunt test; no named driver, team, vehicle maker, venue, or brand is depicted.",
      "Prompt summary: closed proving ground, unbranded car approaching a low ramp, safety barriers and engineers recording measurements.",
      "[/Sources]",
    ].join("\n"),
  },
  {
    slide: 37,
    asset: path.join(workspace, "assets/real/ozone-discovery-team.jpg"),
    contentType: "image/jpeg",
    alt: "Joe Farman, Brian Gardiner and Jon Shanklin with a Dobson ozone spectrophotometer",
    notes: [
      "[Sources]",
      "Case photo and background: British Antarctic Survey, 'The ozone hole discovery'. Photo credit: Chris Gilbert.",
      "https://www.bas.ac.uk/about/history/ozone-hole-discovery/",
      "[/Sources]",
    ].join("\n"),
  },
  {
    slide: 53,
    asset: path.join(workspace, "assets/real/ligo-hanford.jpg"),
    contentType: "image/jpeg",
    alt: "Aerial photograph of the LIGO Hanford gravitational-wave observatory",
    notes: [
      "[Sources]",
      "Case photo: LIGO Hanford aerial view. Credit: Caltech/MIT/LIGO Lab.",
      "https://www.ligo.caltech.edu/image/ligo20150731e",
      "Case background: https://www.ligo.caltech.edu/detection",
      "[/Sources]",
    ].join("\n"),
  },
];

for (const item of cases) {
  const slide = presentation.slides.getItem(item.slide - 1);
  const body = slide.shapes.items.find((shape) => shape.name === "Text 3");
  if (!body) throw new Error(`Missing Text 3 body on slide ${item.slide}`);
  body.position = { ...commonBodyFrame };
  slide.images.add({
    blob: await bytes(item.asset),
    contentType: item.contentType,
    alt: item.alt,
    fit: "cover",
    position: { ...commonImageFrame },
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
  slide.speakerNotes.append(`\n${item.notes}`);
}

{
  const slide = presentation.slides.getItem(45);
  const image = slide.images.items[0];
  if (!image) throw new Error("Missing inherited image on slide 46");
  image.replace({
    blob: await bytes(path.join(workspace, "assets/real/ingenuity-mars.jpg")),
    contentType: "image/jpeg",
    alt: "NASA's Ingenuity Mars Helicopter photographed on the Martian surface by Perseverance",
    fit: "cover",
  });
  image.frame = { ...commonImageFrame };
  image.geometry = "roundRect";
  image.borderRadius = "rounded-xl";
  slide.speakerNotes.append(`\n${[
    "[Sources]",
    "Case photo: Ingenuity at Two Years on Mars (PIA25881). Credit: NASA/JPL-Caltech/ASU/MSSS.",
    "https://commons.wikimedia.org/wiki/File:Ingenuity_at_Two_Years_on_Mars_(PIA25881).jpg",
    "Case background: https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/",
    "[/Sources]",
  ].join("\n")}`);
}

await fs.mkdir(renderDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  await writeBlob(path.join(renderDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text());
}

await writeBlob(path.join(workspace, "final-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));

const inspect = await presentation.inspect({
  kind: "slide,textbox,shape,image,notes,layout",
  maxChars: 50000,
});
await fs.writeFile(path.join(workspace, "final-inspect.ndjson"), inspect.ndjson);

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(finalPptx);

console.log(JSON.stringify({ finalPptx, slideCount: presentation.slides.items.length, renderDir, layoutDir }, null, 2));
