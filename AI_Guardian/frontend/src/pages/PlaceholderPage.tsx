type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-fluent-muted">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-fluent-border bg-fluent-surface p-8 text-sm text-fluent-muted">
        Coming in a later step — layout only for now.
      </div>
    </div>
  );
}
