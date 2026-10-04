export type LifecycleStatus =
  | "queued" | "provisioning" | "running" | "pausing" | "paused" | "resuming"
  | "deleting" | "deleted" | "failed"
  | "deploying" | "stopped"
  | "active" | "inactive" | "healthy" | "degraded" | "error";

/**
 * Lifecycle status pill — icon + text + tone, never color alone. The only way to show
 * sandbox/agent state. In-progress states (provisioning, pausing, resuming, deploying) spin.
 * @startingPoint section="Components" subtitle="All 16 lifecycle states, icon + text, never color alone" viewport="700x280"
 */
export interface StatusBadgeProps {
  status: LifecycleStatus;
  /** Override the default label. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}
export declare const StatusBadge: (props: StatusBadgeProps) => any;
