import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { validateRequirement } from "../api/client";
import type { ValidateRequirementResponse } from "../api/client";

const SAMPLES: {
  id: string;
  label: string;
  title: string;
  description: string;
  expected: string;
}[] = [
  {
    id: "guest",
    label: "Conflict · Guest checkout",
    title: "Guest checkout without account creation",
    description:
      "As a customer, I want to complete checkout with email only and no Azure AD / SSO, so that I can buy faster without creating an account. Guest users can place an order with email only. No Azure AD required on the guest path.",
    expected: "conflict",
  },
  {
    id: "paypal",
    label: "Conflict · PayPal",
    title: "Add PayPal for launch day",
    description:
      "Sales request: Acme Retail requires PayPal beside Stripe on day one of launch, or they will delay the contract. Please enable PayPal as a payment option for MVP.",
    expected: "conflict",
  },
  {
    id: "duplicate",
    label: "Duplicate · Stripe confirm",
    title: "Confirm Stripe payment decision",
    description:
      "As agreed / already decided: confirm that Stripe remains the sole payment gateway for card payments in v1 and PayPal stays out of scope.",
    expected: "duplicate",
  },
  {
    id: "drift",
    label: "Drift · GraphQL",
    title: "Partner GraphQL gateway",
    description:
      "Introduce a GraphQL gateway for external partner integrations to replace some versioned REST endpoints in the current release.",
    expected: "drift",
  },
  {
    id: "ok",
    label: "No conflict · Email template",
    title: "Order confirmation email template",
    description:
      "Add a transactional email template for successful Stripe payments and PostgreSQL order records. No change to authentication, payments, or API standards.",
    expected: "no_conflict",
  },
];

const statusStyles: Record<string, string> = {
  conflict: "bg-[#fde7e9] text-fluent-danger border-[#f1aeb5]",
  duplicate: "bg-[#fff4ce] text-fluent-warning border-[#f2d60d]",
  drift: "bg-[#fff4ce] text-fluent-warning border-[#f2d60d]",
  no_conflict: "bg-[#dff6dd] text-fluent-success border-[#9fd89f]",
};

export function ValidatePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(SAMPLES[0].title);
  const [description, setDescription] = useState(SAMPLES[0].description);
  const [result, setResult] = useState<ValidateRequirementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      validateRequirement({
        title: title.trim(),
        description: description.trim(),
      }),
    onSuccess: (data) => {
      setError(null);
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["validation-history"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      setResult(null);
      setError(axiosErrorDetail(err) ?? "Validation failed.");
    },
  });

  function loadSample(id: string) {
    const sample = SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    setTitle(sample.title);
    setDescription(sample.description);
    setResult(null);
    setError(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  const status = result?.validation.status;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Requirement Validation
        </h2>
        <p className="mt-1 text-fluent-muted">
          Compare a new requirement against Decision Memory for conflicts,
          duplicates, and decision drift.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
            New requirement
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => loadSample(sample.id)}
                className="rounded-md border border-fluent-border px-2.5 py-1.5 text-xs hover:border-fluent-brand"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                required
              />
            </label>
            <button
              type="submit"
              disabled={mutation.isPending || !title.trim() || !description.trim()}
              className="rounded-md bg-fluent-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-fluent-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? "Validating…" : "Validate against Decision Memory"}
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-fluent-danger">{error}</p>}
        </section>

        <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
              Integrity result
            </h3>
            <Link
              to="/history"
              className="text-sm font-medium text-fluent-brand hover:underline"
            >
              Validation history →
            </Link>
          </div>

          {!result && !error && (
            <p className="mt-6 text-sm text-fluent-muted">
              Run a validation to see severity, confidence, matched decision, reason,
              and recommendation.
            </p>
          )}

          {result && status && (
            <div className="mt-4 space-y-4">
              <div
                className={`rounded-md border px-4 py-3 ${statusStyles[status] ?? ""}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {status.replace("_", " ")}
                </p>
                <p className="mt-1 text-sm">
                  Severity: <strong>{result.validation.severity}</strong> · Confidence:{" "}
                  <strong>{(result.validation.confidence * 100).toFixed(0)}%</strong> · Mode:{" "}
                  {result.ai_mode}
                </p>
              </div>

              <ResultBlock label="Existing decision" value={result.existing_decision} />
              <ResultBlock label="New requirement" value={result.new_requirement} />
              <ResultBlock label="Reason" value={result.validation.reason} />
              <ResultBlock
                label="Recommendation"
                value={result.validation.recommendation}
              />

              {result.matched_decision && (
                <div className="rounded-md border border-fluent-border bg-fluent-bg p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fluent-muted">
                    Matched decision card
                  </p>
                  <p className="mt-2 font-semibold">{result.matched_decision.title}</p>
                  <p className="mt-1 text-xs text-fluent-muted">
                    {result.matched_decision.category}
                  </p>
                  <p className="mt-2">{result.matched_decision.decision}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ResultBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-md border border-fluent-border bg-fluent-bg p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-fluent-muted">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
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
