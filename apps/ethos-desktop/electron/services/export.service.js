"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportService = void 0;
const docx_1 = require("docx");
const jspdf_1 = require("jspdf");
const node_fs_1 = __importDefault(require("node:fs"));
exports.exportService = {
    exportToDocx: async (text, outputPath) => {
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {},
                    children: text.split("\n").map((line) => {
                        return new docx_1.Paragraph({
                            children: [new docx_1.TextRun(line)],
                        });
                    }),
                },
            ],
        });
        const buffer = await docx_1.Packer.toBuffer(doc);
        node_fs_1.default.writeFileSync(outputPath, buffer);
    },
    exportToPdf: async (text, outputPath) => {
        const doc = new jspdf_1.jsPDF();
        const lines = doc.splitTextToSize(text, 180);
        doc.text(lines, 10, 10);
        const buffer = doc.output("arraybuffer");
        node_fs_1.default.writeFileSync(outputPath, Buffer.from(buffer));
    },
};
