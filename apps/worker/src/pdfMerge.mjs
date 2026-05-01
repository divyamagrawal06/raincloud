import { PDFDocument } from "pdf-lib";

export const mergePdfBuffers = async (inputBuffers) => {
  if (!Array.isArray(inputBuffers) || inputBuffers.length === 0) {
    throw new Error("At least one PDF buffer is required");
  }

  const output = await PDFDocument.create();

  for (const [index, inputBuffer] of inputBuffers.entries()) {
    let inputDocument;

    try {
      inputDocument = await PDFDocument.load(inputBuffer);
    } catch (error) {
      throw new Error(`Input ${index + 1} is not a readable PDF: ${error.message}`);
    }

    const pages = await output.copyPages(
      inputDocument,
      inputDocument.getPageIndices(),
    );

    for (const page of pages) {
      output.addPage(page);
    }
  }

  return Buffer.from(await output.save());
};
