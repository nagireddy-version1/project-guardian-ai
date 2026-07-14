import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboard, fetchHealth } from "../api/client";

const statusStyles: Record<string, string> = {
  conflict: "bg-[#fde7e9] text-fluent-danger",
  duplicate: "bg-[#fff4ce] text-fluent-warning",
  drift: "bg-[#fff4ce] text-fluent-warning",
  no_conflict: "bg-[#dff6dd] text-fluent-success",
};

export function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const summary = dashboardQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-fluent-muted">
            Decision integrity posture across project memory and requirement checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickLink to="/upload" label="Upload documents" />
          <QuickLink to="/validate" label="Validate requirement" primary />
        </div>
      </div>

      {dashboardQuery.isLoading && (
        <p className="text-sm text-fluent-muted">Loading dashboard metrics…</p>
      )}
      {dashboardQuery.isError && (
        <p className="text-sm text-fluent-danger">
          Could not load dashboard. Is the API running?
        </p>
      )}

      {summary && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Decisions in memory"
              value={summary.total_decisions}
              hint={`${summary.total_documents} source documents`}
            />
            <MetricCard
              label="Open risks"
              value={summary.open_risks}
              hint={`${summary.conflicts} conflicts · ${summary.drifts} drifts`}
              accent={summary.open_risks > 0 ? "danger" : "success"}
            />
            <MetricCard
              label="Validations run"
              value={summary.total_validations}
              hint={`${summary.total_requirements} requirements checked`}
            />
            <MetricCard
              label="Clean checks"
              value={summary.no_conflicts}
              hint={`${summary.duplicates} duplicates flagged`}
              accent="success"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <BreakdownChip label="Conflicts" value={summary.conflicts} tone="danger" />
            <BreakdownChip label="Duplicates" value={summary.duplicates} tone="warning" />
            <BreakdownChip label="Drift" value={summary.drifts} tone="warning" />
            <BreakdownChip label="No conflict" value={summary.no_conflicts} tone="success" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
                  Recent validations
                </h3>
                <Link to="/history" className="text-sm text-fluent-brand hover:underline">
                  View all
                </Link>
              </div>
              {summary.recent_validations.length === 0 ? (
                <p className="mt-4 text-sm text-fluent-muted">
                  No validations yet. Run a requirement check to see integrity alerts.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {summary.recent_validations.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md border border-fluent-border bg-fluent-bg px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {item.requirement_title ?? `Requirement #${item.requirement_id}`}
                          </p>
                          <p className="mt-1 text-xs text-fluent-muted">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            statusStyles[item.status] ?? ""
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-fluent-muted">
                        {item.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
                  Decision memory snapshot
                </h3>
                <Link to="/decisions" className="text-sm text-fluent-brand hover:underline">
                  Open library
                </Link>
              </div>
              {summary.recent_decisions.length === 0 ? (
                <p className="mt-4 text-sm text-fluent-muted">
                  No decisions yet. Upload meeting notes and extract decisions.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {summary.recent_decisions.map((decision) => (
                    <li
                      key={decision.id}
                      className="rounded-md border border-fluent-border bg-fluent-bg px-3 py-3"
                    >
                      <p className="text-sm font-semibold">{decision.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-fluent-muted">
                        {decision.category} · {(decision.confidence * 100).toFixed(0)}%
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-fluent-muted">
                        {decision.decision}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fluent-muted">
          System status
        </h3>
        {healthQuery.isLoading && (
          <p className="mt-4 text-sm text-fluent-muted">Checking API…</p>
        )}
        {healthQuery.isError && (
          <p className="mt-4 text-sm text-fluent-danger">API unreachable.</p>
        )}
        {healthQuery.data && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="API" value={healthQuery.data.status} />
            <Stat label="Database" value={healthQuery.data.database} />
            <Stat label="AI mode" value={healthQuery.data.ai_mode} />
            <Stat label="App" value={healthQuery.data.app} />
          </dl>
        )}
      </section>

      <section className="rounded-lg border border-fluent-border bg-fluent-surface p-6 shadow-sm">
        <h3 className="font-semibold">5-minute demo path</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fluent-muted">
          <li>
            Upload <code className="rounded bg-fluent-bg px-1">teams_sprint_planning_notes.txt</code>{" "}
            and extract decisions.
          </li>
          <li>Review Decision Library (Azure AD, PostgreSQL, Stripe, REST).</li>
          <li>
            Validate guest checkout and PayPal samples — show conflict alerts.
          </li>
          <li>Show GraphQL drift and Stripe duplicate, then return here for metrics.</li>
        </ol>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "danger" | "success";
}) {
  const valueClass =
    accent === "danger"
      ? "text-fluent-danger"
      : accent === "success"
        ? "text-fluent-success"
        : "text-fluent-text";

  return (
    <div className="rounded-lg border border-fluent-border bg-fluent-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-fluent-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm text-fluent-muted">{hint}</p>
    </div>
  );
}

function BreakdownChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-[#fde7e9] text-fluent-danger"
      : tone === "warning"
        ? "bg-[#fff4ce] text-fluent-warning"
        : "bg-[#dff6dd] text-fluent-success";

  return (
    <div className={`rounded-lg px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuickLink({
  to,
  label,
  primary,
}: {
  to: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        primary
          ? "rounded-md bg-fluent-brand px-3 py-2 text-sm font-semibold text-white hover:bg-fluent-brand-hover"
          : "rounded-md border border-fluent-border bg-white px-3 py-2 text-sm font-medium hover:border-fluent-brand"
      }
    >
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-fluent-border bg-fluent-bg px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-fluent-muted">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold capitalize">{value}</dd>
    </div>
  );
}
