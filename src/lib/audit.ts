// Structured audit logging — one [AUDIT] line per mutation, grep-able from
// `wrangler tail`. Every line is a single parseable JSON object so an
// investigation is `wrangler tail | grep AUDIT | jq ...`, not archaeology.

export type AuditOutcome = "success" | "failure";

export function auditLog(entry: {
  actor: string; // user id, or "anonymous" for unauthenticated attempts
  action: string; // e.g. "notebook_entry.create", "reagent.stock_update"
  target?: string; // the id of the thing being acted on, if any
  outcome: AuditOutcome;
  details?: Record<string, unknown>;
}): void {
  console.log(
    "[AUDIT]",
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    })
  );
}
