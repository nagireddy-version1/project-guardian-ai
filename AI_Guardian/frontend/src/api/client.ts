import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

export type HealthResponse = {
  status: string;
  app: string;
  database: string;
  ai_mode: string;
};

export type DocumentRead = {
  id: number;
  filename: string;
  original_name: string;
  content_type: string;
  source_type: string;
  uploaded_at: string;
};

export type DocumentDetail = DocumentRead & {
  content: string;
  preview: string;
};

export type DecisionRead = {
  id: number;
  title: string;
  category: string;
  decision: string;
  reason: string;
  confidence: number;
  source_document: string;
  document_id: number | null;
  created_at: string;
};

export type ExtractDecisionsResponse = {
  document_id: number;
  document_name: string;
  ai_mode: string;
  removed_existing: number;
  extracted_count: number;
  decisions: DecisionRead[];
};

export type SourceType =
  | "meeting_notes"
  | "jira_story"
  | "github_pr"
  | "outlook_email"
  | "other";

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function listDocuments(): Promise<DocumentRead[]> {
  const { data } = await api.get<DocumentRead[]>("/documents");
  return data;
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
  return data;
}

export async function uploadDocument(
  file: File,
  sourceType: SourceType,
): Promise<DocumentDetail> {
  const form = new FormData();
  form.append("file", file);
  form.append("source_type", sourceType);
  const { data } = await api.post<DocumentDetail>("/upload-document", form);
  return data;
}

export async function extractDecisions(
  documentId: number,
  replaceExisting = true,
): Promise<ExtractDecisionsResponse> {
  const { data } = await api.post<ExtractDecisionsResponse>("/extract-decisions", {
    document_id: documentId,
    replace_existing: replaceExisting,
  });
  return data;
}

export async function listDecisions(documentId?: number): Promise<DecisionRead[]> {
  const { data } = await api.get<DecisionRead[]>("/decisions", {
    params: documentId ? { document_id: documentId } : undefined,
  });
  return data;
}

export type RequirementCreate = {
  title: string;
  description: string;
};

export type RequirementRead = {
  id: number;
  title: string;
  description: string;
  uploaded_at: string;
};

export type ValidationResultRead = {
  id: number;
  decision_id: number | null;
  requirement_id: number;
  status: "conflict" | "duplicate" | "drift" | "no_conflict";
  severity: "none" | "low" | "medium" | "high" | "critical";
  reason: string;
  recommendation: string;
  confidence: number;
  created_at: string;
};

export type ValidateRequirementResponse = {
  ai_mode: string;
  requirement: RequirementRead;
  validation: ValidationResultRead;
  matched_decision: DecisionRead | null;
  existing_decision: string | null;
  new_requirement: string | null;
};

export type ValidationHistoryItem = ValidationResultRead & {
  requirement_title: string | null;
  decision_title: string | null;
};

export async function validateRequirement(
  payload: RequirementCreate,
): Promise<ValidateRequirementResponse> {
  const { data } = await api.post<ValidateRequirementResponse>(
    "/validate-requirement",
    payload,
  );
  return data;
}

export async function fetchValidationHistory(): Promise<ValidationHistoryItem[]> {
  const { data } = await api.get<ValidationHistoryItem[]>("/validation-history");
  return data;
}

export type DashboardSummary = {
  total_decisions: number;
  total_documents: number;
  total_requirements: number;
  total_validations: number;
  conflicts: number;
  duplicates: number;
  drifts: number;
  no_conflicts: number;
  open_risks: number;
  ai_mode: string;
  recent_validations: ValidationHistoryItem[];
  recent_decisions: DecisionRead[];
};

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard");
  return data;
}

export type SettingsRead = {
  app_name: string;
  use_mock_ai: boolean;
  azure_configured: boolean;
  azure_openai_endpoint: string | null;
  azure_openai_deployment: string;
  azure_openai_api_version: string;
  api_key_configured: boolean;
  effective_ai_mode: string;
  note: string;
};

export type SettingsUpdate = {
  use_mock_ai?: boolean;
  azure_openai_endpoint?: string;
  azure_openai_api_key?: string;
  azure_openai_deployment?: string;
  azure_openai_api_version?: string;
};

export async function fetchSettings(): Promise<SettingsRead> {
  const { data } = await api.get<SettingsRead>("/settings");
  return data;
}

export async function updateSettings(payload: SettingsUpdate): Promise<SettingsRead> {
  const { data } = await api.put<SettingsRead>("/settings", payload);
  return data;
}
