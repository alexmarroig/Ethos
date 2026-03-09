export type ClinicalNoteExportPayload = {
  patientName: string;
  clinicianName: string;
  sessionDate: string;
  status: "draft" | "validated";
  noteText: string;
  validatedAt?: string;
};

type ExportFormat = "pdf" | "docx";

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const textEncoder = new TextEncoder();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const escapePdf = (value: string) => value.replace(/[()\\]/g, (match) => `\\${match}`);

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9-_]+/g, "_").toLowerCase();

const concatUint8Arrays = (chunks: Uint8Array[]) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const toUint16LE = (value: number) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);

const toUint32LE = (value: number) =>
  new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);

const buildZip = (entries: ZipEntry[]) => {
  const fileRecords: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const fileNameBytes = textEncoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = concatUint8Arrays([
      toUint32LE(0x04034b50),
      toUint16LE(20),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint32LE(crc),
      toUint32LE(entry.data.length),
      toUint32LE(entry.data.length),
      toUint16LE(fileNameBytes.length),
      toUint16LE(0),
      fileNameBytes,
    ]);

    fileRecords.push(localHeader, entry.data);

    const centralHeader = concatUint8Arrays([
      toUint32LE(0x02014b50),
      toUint16LE(20),
      toUint16LE(20),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint32LE(crc),
      toUint32LE(entry.data.length),
      toUint32LE(entry.data.length),
      toUint16LE(fileNameBytes.length),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint16LE(0),
      toUint32LE(0),
      toUint32LE(offset),
      fileNameBytes,
    ]);

    centralDirectory.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  });

  const centralDirectoryBytes = concatUint8Arrays(centralDirectory);
  const endOfCentralDirectory = concatUint8Arrays([
    toUint32LE(0x06054b50),
    toUint16LE(0),
    toUint16LE(0),
    toUint16LE(entries.length),
    toUint16LE(entries.length),
    toUint32LE(centralDirectoryBytes.length),
    toUint32LE(offset),
    toUint16LE(0),
  ]);

  return concatUint8Arrays([...fileRecords, centralDirectoryBytes, endOfCentralDirectory]);
};

const buildDocx = (payload: ClinicalNoteExportPayload) => {
  const lines = [
    `Prontuário ${payload.status === "validated" ? "validado" : "rascunho"}`,
    `Paciente: ${payload.patientName}`,
    `Profissional: ${payload.clinicianName}`,
    `Sessão: ${payload.sessionDate}`,
    payload.validatedAt ? `Validado em: ${payload.validatedAt}` : "",
    "",
    payload.noteText,
  ].filter(Boolean);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n  <w:body>\n${lines
    .map((line) => `    <w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("\n")}\n  </w:body>\n</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n</Types>`;

  const relationships = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>\n</Relationships>`;

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: textEncoder.encode(contentTypes),
    },
    {
      name: "_rels/.rels",
      data: textEncoder.encode(relationships),
    },
    {
      name: "word/document.xml",
      data: textEncoder.encode(documentXml),
    },
  ];

  return buildZip(entries);
};

const buildPdf = (payload: ClinicalNoteExportPayload) => {
  const lines = [
    `Prontuário ${payload.status === "validated" ? "validado" : "rascunho"}`,
    `Paciente: ${payload.patientName}`,
    `Profissional: ${payload.clinicianName}`,
    `Sessão: ${payload.sessionDate}`,
    payload.validatedAt ? `Validado em: ${payload.validatedAt}` : "",
    "",
    payload.noteText,
  ].filter(Boolean);

  const contentLines = ["BT", "/F1 12 Tf", "72 720 Td", ...lines.flatMap((line) => [`(${escapePdf(line)}) Tj`, "T*"]), "ET"];
  const contentStream = contentLines.join("\n");
  const contentLength = contentStream.length;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let offset = 0;
  const header = "%PDF-1.4\n";
  const offsets: number[] = [];

  offset += header.length;
  objects.forEach((obj) => {
    offsets.push(offset);
    offset += obj.length;
  });

  const xrefOffset = offset;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  offsets.forEach((objOffset) => {
    xrefLines.push(`${objOffset.toString().padStart(10, "0")} 00000 n `);
  });
  const xref = `${xrefLines.join("\n")}\n`;

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfString = header + objects.join("") + xref + trailer;
  return textEncoder.encode(pdfString);
};

const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportClinicalNote = async (payload: ClinicalNoteExportPayload, format: ExportFormat) => {
  const baseName = sanitizeFileName(`prontuario_${payload.patientName}_${payload.sessionDate}`);
  if (format === "pdf") {
    const pdf = buildPdf(payload);
    downloadFile(new Blob([pdf], { type: "application/pdf" }), `${baseName}.pdf`);
    return `${baseName}.pdf`;
  }

  const docx = buildDocx(payload);
  downloadFile(
    new Blob([docx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    `${baseName}.docx`
  );
  return `${baseName}.docx`;
};
