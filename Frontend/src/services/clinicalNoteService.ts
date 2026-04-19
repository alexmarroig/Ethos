import { api, type ApiResult } from "./apiClient";

type RawClinicalNote = {
  id: string;
  session_id: string;
  status: "draft" | "validated";
  validated_at?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
  content: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

export interface ClinicalNoteContent {
  queixa_principal: string;
  observacoes_clinicas: string;
  evolucao: string;
  plano_terapeutico: string;
}

export interface ClinicalNote {
  id: string;
  session_id: string;
  status: "draft" | "validated";
  validated_at?: string;
  validated_by?: string;
  content: ClinicalNoteContent;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

const emptyContent = (): ClinicalNoteContent => ({
  queixa_principal: "",
  observacoes_clinicas: "",
  evolucao: "",
  plano_terapeutico: "",
});

function extractSection(source: string, heading: RegExp) {
  const match = heading.exec(source);
  return match?.[1]?.trim() ?? "";
}

function deserializeContent(content: string): ClinicalNoteContent {
  if (!content.trim()) return emptyContent();

  const additionalNotes = extractSection(content, /## OBSERVA(?:ÇÕES|COES) ADICIONAIS\s*([\s\S]*?)$/i);
  const queixa = extractSection(content, /## 3\.[\s\S]*?QUEIXA PRINCIPAL\s*([\s\S]*?)## 4\./i);
  const contexto = extractSection(content, /## 4\.[\s\S]*?CONTEXTO\s*([\s\S]*?)## 5\./i);
  const plano = extractSection(content, /## 7\.[\s\S]*?PLANO TERAPÊUTICO\s*([\s\S]*?)## 8\./i);
  const evolucao = extractSection(
    content,
    /## 8\.[\s\S]*?EVOLU(?:ÇÃO|CAO) DA SESS(?:ÃO|AO)[\s\S]*?SOAP\)\s*([\s\S]*?)(?:## 9\.|## OBSERVA)/i,
  );

  if (!queixa && !contexto && !plano && !evolucao) {
    return {
      ...emptyContent(),
      observacoes_clinicas: additionalNotes || content.trim(),
    };
  }

  return {
    queixa_principal: queixa,
    observacoes_clinicas: contexto || additionalNotes || "",
    evolucao,
    plano_terapeutico: plano,
  };
}

function serializeContent(content: ClinicalNoteContent) {
  return [
    "## 3. QUEIXA PRINCIPAL",
    content.queixa_principal || "Não informado",
    "",
    "## 4. CONTEXTO",
    content.observacoes_clinicas || "Não informado",
    "",
    "## 7. PLANO TERAPÊUTICO",
    content.plano_terapeutico || "Não informado",
    "",
    "## 8. EVOLUÇÃO DA SESSÃO (SOAP)",
    content.evolucao || "Não informado",
  ].join("\n");
}

function mapNote(raw: RawClinicalNote): ClinicalNote {
  return {
    id: raw.id,
    session_id: raw.session_id,
    status: raw.status,
    validated_at: raw.validated_at,
    version: raw.version,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    content: deserializeContent(raw.content),
  };
}

function ok<TInput, TOutput>(
  result: ApiResult<TInput>,
  mapper: (value: TInput) => TOutput,
): ApiResult<TOutput> {
  if (!result.success) return result;
  return {
    ...result,
    data: mapper(result.data),
  };
}

export const clinicalNoteService = {
  create: async (
    sessionId: string,
    content: ClinicalNoteContent,
  ): Promise<ApiResult<ClinicalNote>> => {
    const result = await api.post<RawClinicalNote>(`/sessions/${sessionId}/clinical-note`, {
      content: serializeContent(content),
    });
    return ok(result, mapNote);
  },

  listBySession: async (sessionId: string): Promise<ApiResult<ClinicalNote[]>> => {
    const result = await api.get<PaginatedResponse<RawClinicalNote> | RawClinicalNote[]>(
      `/sessions/${sessionId}/clinical-notes`,
    );
    return ok(result, (payload) => {
      const items = Array.isArray(payload) ? payload : payload.items;
      return items.map(mapNote);
    });
  },

  getById: async (noteId: string): Promise<ApiResult<ClinicalNote>> => {
    const result = await api.get<RawClinicalNote>(`/clinical-notes/${noteId}`);
    return ok(result, mapNote);
  },

  validate: async (noteId: string): Promise<ApiResult<ClinicalNote>> => {
    const result = await api.post<RawClinicalNote>(`/clinical-notes/${noteId}/validate`);
    return ok(result, mapNote);
  },
};
