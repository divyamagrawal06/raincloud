import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveBlobKey } from "../src/payload.mjs";

const payloadPath =
  process.argv[2] ?? "fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json";
const outputDirectory = process.argv[3] ?? ".tmp/pdf-merge-inputs";

const payload = JSON.parse(await readFile(payloadPath, "utf8"));

const createSeedPdf = async (input, index) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText(input.displayName, {
    x: 72,
    y: 680,
    size: 28,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Raincloud PDF merge smoke input ${index + 1} of ${payload.inputs.length}`, {
    x: 72,
    y: 632,
    size: 14,
    font: bodyFont,
    color: rgb(0.25, 0.25, 0.25),
  });
  page.drawText(`Task: ${payload.taskId}`, {
    x: 72,
    y: 604,
    size: 12,
    font: bodyFont,
    color: rgb(0.35, 0.35, 0.35),
  });

  return Buffer.from(await doc.save());
};

for (const [index, input] of payload.inputs.entries()) {
  const { container, blobName } = resolveBlobKey(input.blobKey);
  const pdf = await createSeedPdf(input, index);
  const filePath = join(outputDirectory, blobName);

  await mkdir(join(outputDirectory, blobName.split("/").slice(0, -1).join("/")), {
    recursive: true,
  });
  await writeFile(filePath, pdf);

  console.log(`Wrote ${container}/${blobName} -> ${filePath}`);
}
