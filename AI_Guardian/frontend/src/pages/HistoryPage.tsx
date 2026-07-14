import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchValidationHistory } from "../api/client";

const statusStyles: Record<string, string> = {
  conflict: "bg-[#fde7e9] text-fluent-danger",
  duplicate: "bg-[#fff4ce] text-fluent-warning",
  drift: "bg-[#fff4ce] text-fluent-warning",
  no_conflict: "bg-[#dff6dd] text-fluent-success",
};

export function HistoryPage() {
  const historyQuery = useQuery({
    queryKey: ["validation-history"],
    queryFn: fetchValidationHistory,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Validation History</h2>
          <p className="mt-1 text-fluent-muted">
            Past integrity checks saved from requirement validation.
          </p>
        </div>
        <Link
          to="/validate"
          className="rounded-md border border-fluent-border bg-white px-3 py-2 text-sm font-medium hover:border-fluent-brand"
        >
          New validation
        </Link>
      </div>

      {historyQuery.isLoading && (
        <p className="text-sm text-fluent-muted">Loading history…</p>
      )}
      {historyQuery.isError && (
        <p className="text-sm text-fluent-danger">Could not load validation history.</p>
      )}
      {historyQuery.data?.length === 0 && (
        <div className="rounded-lg border border-dashed border-fluent-border bg-fluent-surface p-8 text-sm text-fluent-muted">
          No validations yet. Run a requirement check first.
        </div>
      )}

      <ul className="space-y-3">
        {historyQuery.data?.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-fluent-border bg-fluent-surface p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {item.requirement_title ?? `Requirement #${item.requirement_id}`}
                </p>
                <p className="mt-1 text-xs text-fluent-muted">
                  {new Date(item.created_at).toLocaleString()}
                  {item.decision_title ? ` · vs ${item.decision_title}` : ""}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                  statusStyles[item.status] ?? ""
                }`}
              >
                {item.status.replace("_", " ")} · {item.severity}
              </span>
            </div>
            <p className="mt-3 text-sm">{item.reason}</p>
            <p className="mt-2 text-sm text-fluent-muted">
              <span className="font-medium text-fluent-text">Recommendation:</span>{" "}
              {item.recommendation}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
