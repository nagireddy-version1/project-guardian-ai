import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  extractDecisions,
  getDocument,
  listDocuments,
  uploadDocument,
} from "../api/client";
import type {
  DocumentDetail,
  ExtractDecisionsResponse,
  SourceType,
} from "../api/client";

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "meeting_notes", label: "Teams meeting notes" },
  { value: "jira_story", label: "Jira story / AC" },
  { value: "github_pr", label: "GitHub PR description" },
  { value: "outlook_email", label: "Outlook email" },
  { value: "other", label: "Other document" },
];

function formatSource(source: string): string {
  return SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function UploadPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("meeting_notes");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [extractError, setExtractError] = useState(false);
  const [lastExtract, setLastExtract] = useState<ExtractDecisionsResponse | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: listDocuments,
  });

  const detailQuery = useQuery({
    queryKey: ["documents", selectedId],
    queryFn: () => getDocument(selectedId!),
    enabled: selectedId !== null,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        return Promise.reject(new Error("Choose a file to upload."));
      }
      return uploadDocument(file, sourceType);
    },
    onSuccess: (doc: DocumentDetail) => {
      setExtractError(false);
      setMessage(`Uploaded “${doc.original_name}” successfully.`);
      setFile(null);
      setSelectedId(doc.id);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: unknown) => {
      setExtractError(true);
      setMessage(
        axiosErrorDetail(err) ??
          (err instanceof Error ? err.message : "Upload failed."),
      );
    },
  });

  const extractMutation = useMutation({
    mutationFn: (documentId: number) => extractDecisions(documentId),
    onSuccess: (result) => {
      setExtractError(false);
      setLastExtract(result);
      setMessage(
        `Extracted ${result.extracted_count} decision(s) from “${result.document_name}” (${result.ai_mode}).`,
      );
      void queryClient.invalidateQueries({ queryKey: ["decisions"] });
    },
    onError: (err: unknown) => {
      setExtractError(true);
      setMessage(
        axiosErrorDetail(err) ??
          (err instanceof Error ? err.message : "Extraction failed."),
      );
    },
  });

  const selectedName = useMemo(() => {
    if (!selectedId || !documentsQuery.data) return null;
    return documentsQuery.data.find((d) => d.id === selectedId)?.original_name;
  }, [documentsQuery.data, selectedId]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLastExtract(null);
    uploadMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Documents</h2>
        <p className="mt-1 text-fluent-muted">
          Simulate Teams, Jira, GitHub, or Outlook events by uploading sample
          project documents into Decision Memory.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
            New upload
          </h3>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Source type</span>
              <select
                className="w-full rounded-md border border-fluent-border bg-white px-3 py-2 outline-none focus:border-fluent-brand"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Document (.txt / .md)</span>
              <input
                type="file"
                accept=".txt,.md,.text,text/plain,text/markdown"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-fluent-brand file:px-3 file:py-2 file:text-white hover:file:bg-fluent-brand-hover"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {file && (
              <p className="text-sm text-fluent-muted">
                Selected: {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
              </p>
            )}

            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="rounded-md bg-fluent-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-fluent-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload document"}
            </button>
          </form>

          {message && (
            <p
              className={`mt-4 text-sm ${
                extractError || uploadMutation.isError
                  ? "text-fluent-danger"
                  : "text-fluent-success"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-6 rounded-md border border-dashed border-fluent-border bg-fluent-bg p-4 text-sm text-fluent-muted">
            <p className="font-medium text-fluent-text">Demo tip</p>
            <p className="mt-1">
              Upload{" "}
              <code className="rounded bg-white px-1">
                sample_documents/teams_sprint_planning_notes.txt
              </code>
              , then click <strong>Extract decisions</strong>.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
              Uploaded documents
            </h3>
            <span className="text-xs text-fluent-muted">
              {documentsQuery.data?.length ?? 0} total
            </span>
          </div>

          {documentsQuery.isLoading && (
            <p className="mt-4 text-sm text-fluent-muted">Loading documents…</p>
          )}
          {documentsQuery.isError && (
            <p className="mt-4 text-sm text-fluent-danger">
              Failed to load documents. Is the API running?
            </p>
          )}
          {documentsQuery.data?.length === 0 && (
            <p className="mt-4 text-sm text-fluent-muted">
              No documents yet. Upload a file to begin.
            </p>
          )}

          <ul className="mt-4 max-h-72 space-y-2 overflow-auto">
            {documentsQuery.data?.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(doc.id);
                    setLastExtract(null);
                  }}
                  className={[
                    "w-full rounded-md border px-3 py-3 text-left transition",
                    selectedId === doc.id
                      ? "border-fluent-brand bg-[#eff6fc]"
                      : "border-fluent-border hover:border-fluent-brand/50",
                  ].join(" ")}
                >
                  <p className="truncate text-sm font-semibold">{doc.original_name}</p>
                  <p className="mt-1 text-xs text-fluent-muted">
                    {formatSource(doc.source_type)} · {formatDate(doc.uploaded_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedId !== null && (
        <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
                Document preview
              </h3>
              <p className="mt-1 text-sm text-fluent-muted">
                {selectedName ?? `Document #${selectedId}`}
              </p>
            </div>
            <button
              type="button"
              disabled={extractMutation.isPending}
              onClick={() => extractMutation.mutate(selectedId)}
              className="rounded-md bg-fluent-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-fluent-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extractMutation.isPending ? "Extracting…" : "Extract decisions"}
            </button>
          </div>

          {detailQuery.isLoading && (
            <p className="mt-4 text-sm text-fluent-muted">Loading content…</p>
          )}
          {detailQuery.data && (
            <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-fluent-border bg-fluent-bg p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {detailQuery.data.content}
            </pre>
          )}

          {lastExtract && lastExtract.document_id === selectedId && (
            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">
                  Extracted decisions ({lastExtract.extracted_count})
                </h4>
                <Link
                  to="/decisions"
                  className="text-sm font-medium text-fluent-brand hover:underline"
                >
                  Open Decision Library →
                </Link>
              </div>
              {lastExtract.decisions.length === 0 ? (
                <p className="text-sm text-fluent-muted">
                  No final decisions detected in this document.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {lastExtract.decisions.map((decision) => (
                    <li
                      key={decision.id}
                      className="rounded-md border border-fluent-border bg-fluent-bg p-4"
                    >
                      <p className="text-sm font-semibold">{decision.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-fluent-muted">
                        {decision.category} · {(decision.confidence * 100).toFixed(0)}%
                      </p>
                      <p className="mt-2 text-sm">{decision.decision}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function axiosErrorDetail(err: unknown): string | null {
  if (!err || typeof err !== "object" || !("response" in err)) return null;
  const response = (err as { response?: { data?: { detail?: unknown } } }).response;
  const detail = response?.data?.detail;
  if (typeof detail === "string") return detail;
  return null;
}
