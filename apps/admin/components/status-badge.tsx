import { Badge } from "@capitech/ui";
import { humanize } from "@capitech/lib";
import { cn } from "@capitech/ui";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active" || status === "approved" || status === "posted"
      ? "success"
      : status === "pending"
        ? "warning"
        : status === "frozen" || status === "rejected" || status === "suspended" || status === "failed"
          ? "destructive"
          : status === "level_2" || status === "level_1"
            ? "info"
            : "neutral";
  return <Badge variant={variant as any}>{humanize(status)}</Badge>;
}

export function RiskBadge({ score }: { score: number }) {
  const level = score < 20 ? "low" : score < 50 ? "medium" : "high";
  return (
    <Badge variant={level === "low" ? "success" : level === "medium" ? "warning" : "destructive"}>
      <span className={cn("size-1.5 rounded-full", level === "low" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-500")} />
      {level} · {score}
    </Badge>
  );
}
