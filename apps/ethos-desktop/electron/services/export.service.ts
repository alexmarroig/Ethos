import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import fs from "node:fs";

export const exportService = {
  exportToDocx: async (text: string, outputPath: string): Promise<void> => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: text.split("\n").map((line) => {
            return new Paragraph({
              children: [new TextRun(line)],
            });
          }),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
  },

  exportToPdf: async (text: string, outputPath: string): Promise<void> => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);
    const buffer = doc.output("arraybuffer");
    fs.writeFileSync(outputPath, Buffer.from(buffer));
  },
};
