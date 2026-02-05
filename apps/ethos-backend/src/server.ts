import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  addAudio,
  addTranscript,
  createAnamnesis,
  createClinicalNoteDraft,
  createFinancialEntry,
  createFormEntry,
  createReceipt,
  createReport,
  createScaleRecord,
  createSession,
  db,
  patchSessionStatus,
} from "./store";

type Json = Record<string, unknown>;

const readJson = async (req: IncomingMessage): Promise<Json> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  const text = Buffer.concat(chunks).toString("utf-8") || "{}";
  return JSON.parse(text) as Json;
};

const send = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

const safeLog = (method: string, path: string, statusCode: number, code: string) => {
  process.stdout.write(`${JSON.stringify({ level: "info", method, path, statusCode, code, ts: new Date().toISOString() })}\n`);
};

export const createEthosBackend = () =>
  createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const path = req.url ?? "/";

    try {
      if (method === "POST" && path === "/sessions") {
        const body = await readJson(req);
        const session = createSession(String(body.patient_id), String(body.scheduled_at));
        safeLog(method, path, 201, "SESSION_CREATED");
        return send(res, 201, session);
      }

      const sessionStatus = path.match(/^\/sessions\/([^/]+)\/status$/);
      if (method === "PATCH" && sessionStatus) {
        const body = await readJson(req);
        const patched = patchSessionStatus(sessionStatus[1], body.status as never);
        if (!patched) return send(res, 404, { error: "Session not found", code: "NOT_FOUND" });
        safeLog(method, path, 200, "SESSION_STATUS_UPDATED");
        return send(res, 200, patched);
      }

      const sessionAudio = path.match(/^\/sessions\/([^/]+)\/audio$/);
      if (method === "POST" && sessionAudio) {
        const body = await readJson(req);
        if (!body.consent_confirmed) return send(res, 422, { error: "Consent required", code: "CONSENT_REQUIRED" });
        const record = addAudio(sessionAudio[1], String(body.file_path), Boolean(body.consent_confirmed));
        safeLog(method, path, 201, "AUDIO_REGISTERED");
        return send(res, 201, record);
      }

      const sessionTranscribe = path.match(/^\/sessions\/([^/]+)\/transcribe$/);
      if (method === "POST" && sessionTranscribe) {
        const body = await readJson(req);
        const transcript = addTranscript(sessionTranscribe[1], String(body.raw_text ?? ""));
        safeLog(method, path, 202, "TRANSCRIPT_ORGANIZED");
        return send(res, 202, {
          ...transcript,
          notice: "IA apenas organizou texto. Sem diagnóstico, sem conduta.",
        });
      }

      const noteCreate = path.match(/^\/sessions\/([^/]+)\/clinical-note$/);
      if (method === "POST" && noteCreate) {
        const body = await readJson(req);
        const note = createClinicalNoteDraft(noteCreate[1], String(body.content));
        safeLog(method, path, 201, "CLINICAL_NOTE_DRAFT_CREATED");
        return send(res, 201, note);
      }

      const noteValidate = path.match(/^\/clinical-notes\/([^/]+)\/validate$/);
      if (method === "POST" && noteValidate) {
        const note = validateOrNull(noteValidate[1]);
        if (!note) return send(res, 404, { error: "Clinical note not found", code: "NOT_FOUND" });
        safeLog(method, path, 200, "CLINICAL_NOTE_VALIDATED");
        return send(res, 200, note);
      }

      if (method === "POST" && path === "/reports") {
        const body = await readJson(req);
        const report = createReport(String(body.patient_id), body.purpose as never, String(body.content));
        if (!report) return send(res, 422, { error: "Validated note required", code: "VALIDATED_NOTE_REQUIRED" });
        safeLog(method, path, 201, "REPORT_CREATED");
        return send(res, 201, report);
      }

      if (method === "POST" && path === "/anamnesis") {
        const body = await readJson(req);
        return send(res, 201, createAnamnesis(String(body.patient_id), String(body.template_id), (body.content as Json) ?? {}));
      }

      if (method === "POST" && path === "/scales/record") {
        const body = await readJson(req);
        return send(res, 201, createScaleRecord(String(body.scale_id), String(body.patient_id), Number(body.score)));
      }

      if (method === "POST" && path === "/forms/entry") {
        const body = await readJson(req);
        const entry = createFormEntry(String(body.patient_id), String(body.form_id), (body.content as Json) ?? {});
        return send(res, 201, { ...entry, note: "Não integrado automaticamente ao prontuário." });
      }

      if (method === "POST" && path === "/financial/entry") {
        const body = await readJson(req);
        return send(res, 201, createFinancialEntry(body as never));
      }

      if (method === "POST" && path === "/financial/reminder") {
        const body = await readJson(req);
        return send(res, 200, { reminder_text: `Lembrete amigável: pagamento de ${body.amount} vence em ${body.due_date}.`, sent: false });
      }

      if (method === "POST" && path === "/export/pdf") return send(res, 202, { file_path: "vault://exports/clinical.pdf" });
      if (method === "POST" && path === "/export/docx") return send(res, 202, { file_path: "vault://exports/clinical.docx" });
      if (method === "POST" && path === "/backup") return send(res, 202, { backup_path: "vault://backup/latest.enc" });
      if (method === "POST" && path === "/restore") return send(res, 202, { restored: true });
      if (method === "POST" && path === "/purge") return send(res, 202, { purged: true });

      if (method === "POST" && path === "/ai/organize") {
        const body = await readJson(req);
        return send(res, 200, {
          structured_text: String(body.text ?? "").trim(),
          compliance: "Apenas organização textual. Sem diagnóstico ou conduta.",
        });
      }

      if (method === "GET" && path === "/contracts") {
        return send(res, 200, {
          endpoints: [
            "POST /sessions",
            "PATCH /sessions/{id}/status",
            "POST /sessions/{id}/audio",
            "POST /sessions/{id}/transcribe",
            "POST /sessions/{id}/clinical-note",
            "POST /clinical-notes/{id}/validate",
            "POST /reports",
            "POST /anamnesis",
            "POST /scales/record",
            "POST /forms/entry",
            "POST /financial/entry",
            "POST /financial/reminder",
            "POST /export/pdf",
            "POST /export/docx",
            "POST /backup",
            "POST /restore",
            "POST /purge",
          ],
          safeguards: ["offline-first", "draft-first", "human-validation-required", "logs-sem-texto-clinico"],
        });
      }

      return send(res, 404, { error: "Not Found", code: "NOT_FOUND" });
    } catch {
      return send(res, 400, { error: "Invalid request", code: "BAD_REQUEST" });
    }
  });

const validateOrNull = (noteId: string) => {
  const note = db.clinicalNotes.get(noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = new Date().toISOString();
  return note;
};
