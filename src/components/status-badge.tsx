type Status = "draft" | "active" | "archived" | string;

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<string, string> = {
    active: "bg-olive/15 text-olive",
    draft: "bg-dust text-ink/70",
    archived: "bg-dust/60 text-ink/50",
  };
  const cls = styles[status] ?? styles.draft;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
