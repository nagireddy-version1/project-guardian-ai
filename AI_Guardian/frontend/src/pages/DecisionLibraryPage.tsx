import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listDecisions } from "../api/client";

export function DecisionLibraryPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const decisionsQuery = useQuery({
    queryKey: ["decisions"],
    queryFn: () => listDecisions(),
  });

  const categories = useMemo(() => {
    const values = new Set(
      (decisionsQuery.data ?? []).map((d) => d.category).filter(Boolean),
    );
    return ["all", ...Array.from(values).sort()];
  }, [decisionsQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (decisionsQuery.data ?? []).filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (!q) return true;
      return [d.title, d.decision, d.reason, d.source_document]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [category, decisionsQuery.data, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Decision Library</h2>
          <p className="mt-1 text-fluent-muted">
            Project Decision Memory — final decisions extracted from uploaded
            documents.
          </p>
        </div>
        <Link
          to="/upload"
          className="rounded-md border border-fluent-border bg-white px-3 py-2 text-sm font-medium hover:border-fluent-brand"
        >
          Upload / extract more
        </Link>
      </div>

      <section className="rounded-lg border border-fluent-border bg-fluent-surface p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search decisions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-fluent-border px-3 py-2 text-sm outline-none focus:border-fluent-brand"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-fluent-border px-3 py-2 text-sm outline-none focus:border-fluent-brand"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All categories" : item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {decisionsQuery.isLoading && (
        <p className="text-sm text-fluent-muted">Loading decision memory…</p>
      )}
      {decisionsQuery.isError && (
        <p className="text-sm text-fluent-danger">
          Could not load decisions. Is the API running?
        </p>
      )}
      {!decisionsQuery.isLoading && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-fluent-border bg-fluent-surface p-8 text-sm text-fluent-muted">
          No decisions yet. Upload meeting notes and run extraction first.
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {filtered.map((decision) => (
          <li
            key={decision.id}
            className="rounded-lg border border-fluent-border bg-fluent-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-snug">{decision.title}</h3>
              <span className="shrink-0 rounded bg-[#eff6fc] px-2 py-1 text-xs font-semibold text-fluent-brand">
                {(decision.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-fluent-muted">
              {decision.category}
            </p>
            <p className="mt-3 text-sm leading-relaxed">{decision.decision}</p>
            <p className="mt-3 text-sm text-fluent-muted">
              <span className="font-medium text-fluent-text">Reason:</span>{" "}
              {decision.reason}
            </p>
            <p className="mt-3 text-xs text-fluent-muted">
              Source: {decision.source_document} ·{" "}
              {new Date(decision.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
