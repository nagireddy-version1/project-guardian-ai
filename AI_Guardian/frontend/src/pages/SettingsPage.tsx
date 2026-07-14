import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { fetchSettings, updateSettings } from "../api/client";
import type { SettingsRead, SettingsUpdate } from "../api/client";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [useMockAi, setUseMockAi] = useState(true);
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("gpt-4o");
  const [apiVersion, setApiVersion] = useState("2024-08-01-preview");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setUseMockAi(data.use_mock_ai);
    setEndpoint(data.azure_openai_endpoint ?? "");
    setDeployment(data.azure_openai_deployment);
    setApiVersion(data.azure_openai_api_version);
    setApiKey("");
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload: SettingsUpdate) => updateSettings(payload),
    onSuccess: (data: SettingsRead) => {
      setIsError(false);
      setMessage(
        `Saved. Effective AI mode: ${data.effective_ai_mode}` +
          (data.effective_ai_mode === "mock" && !data.use_mock_ai
            ? " (Azure credentials incomplete — falling back to mock)."
            : ""),
      );
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["health"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      setIsError(true);
      setMessage(axiosErrorDetail(err) ?? "Failed to save settings.");
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const payload: SettingsUpdate = {
      use_mock_ai: useMockAi,
      azure_openai_endpoint: endpoint.trim(),
      azure_openai_deployment: deployment.trim() || "gpt-4o",
      azure_openai_api_version: apiVersion.trim() || "2024-08-01-preview",
    };
    if (apiKey.trim()) {
      payload.azure_openai_api_key = apiKey.trim();
    }
    mutation.mutate(payload);
  }

  const data = settingsQuery.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-fluent-muted">
          Choose mock AI for demos, or connect Azure OpenAI for live extraction
          and validation.
        </p>
      </div>

      {settingsQuery.isLoading && (
        <p className="text-sm text-fluent-muted">Loading settings…</p>
      )}
      {settingsQuery.isError && (
        <p className="text-sm text-fluent-danger">Could not load settings.</p>
      )}

      {data && (
        <>
          <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
              Effective mode
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <InfoPill
                label="AI mode"
                value={data.effective_ai_mode}
                tone={data.effective_ai_mode === "mock" ? "warning" : "success"}
              />
              <InfoPill
                label="Azure configured"
                value={data.azure_configured ? "yes" : "no"}
              />
              <InfoPill
                label="API key"
                value={data.api_key_configured ? "saved" : "not set"}
              />
            </div>
            <p className="mt-4 text-sm text-fluent-muted">{data.note}</p>
          </section>

          <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
              AI configuration
            </h3>
            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <label className="flex items-start gap-3 rounded-md border border-fluent-border bg-fluent-bg px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={useMockAi}
                  onChange={(e) => setUseMockAi(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold">Use mock AI</span>
                  <span className="mt-1 block text-sm text-fluent-muted">
                    Recommended for hackathon demos. Works offline with sample
                    documents and deterministic conflict detection.
                  </span>
                </span>
              </label>

              <fieldset
                disabled={useMockAi}
                className="space-y-4 disabled:opacity-60"
              >
                <legend className="mb-2 text-sm font-medium">Azure OpenAI</legend>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Endpoint</span>
                  <input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://your-resource.openai.azure.com/"
                    className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">
                    API key{" "}
                    <span className="font-normal text-fluent-muted">
                      (leave blank to keep existing)
                    </span>
                  </span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      data.api_key_configured ? "••••••••••••" : "Enter API key"
                    }
                    className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                    autoComplete="off"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Deployment</span>
                    <input
                      value={deployment}
                      onChange={(e) => setDeployment(e.target.value)}
                      className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">API version</span>
                    <input
                      value={apiVersion}
                      onChange={(e) => setApiVersion(e.target.value)}
                      className="w-full rounded-md border border-fluent-border px-3 py-2 outline-none focus:border-fluent-brand"
                    />
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-fluent-brand px-4 py-2 text-sm font-semibold text-white hover:bg-fluent-brand-hover disabled:opacity-50"
              >
                {mutation.isPending ? "Saving…" : "Save settings"}
              </button>
            </form>

            {message && (
              <p
                className={`mt-4 text-sm ${
                  isError ? "text-fluent-danger" : "text-fluent-success"
                }`}
              >
                {message}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-dashed border-fluent-border bg-fluent-surface p-6 text-sm text-fluent-muted">
            <p className="font-medium text-fluent-text">Demo safety</p>
            <p className="mt-2">
              Keep mock AI enabled for the judges walkthrough. Switch to Azure
              only if credentials are available and you want to show live GPT
              extraction.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function InfoPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#dff6dd] text-fluent-success"
      : tone === "warning"
        ? "bg-[#fff4ce] text-fluent-warning"
        : "bg-fluent-bg text-fluent-text";

  return (
    <div className={`rounded-md px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
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
