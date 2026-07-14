import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { fetchSettings } from "../api/client";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/upload", label: "Upload Documents" },
  { to: "/decisions", label: "Decision Library" },
  { to: "/validate", label: "Requirement Validation" },
  { to: "/history", label: "Validation History" },
  { to: "/settings", label: "Settings" },
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 30_000,
  });

  const aiMode = settingsQuery.data?.effective_ai_mode ?? "…";

  return (
    <div className="flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col bg-fluent-sidebar text-fluent-sidebar-text">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            Project Integrity
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">AI Guardian</h1>
          <p className="mt-2 text-sm text-white/70">Decision Integrity Engine</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-fluent-brand text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          Hackathon MVP · AI mode:{" "}
          <span className="text-white/80">{aiMode}</span>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-fluent-border bg-fluent-surface px-8 py-4">
          <p className="text-sm text-fluent-muted">
            Prevent project decision conflicts before implementation
          </p>
          <span className="rounded-md bg-[#eff6fc] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-fluent-brand">
            {aiMode === "azure_openai" ? "Azure OpenAI" : "Mock AI"}
          </span>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
