import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "../icons/Icon";

/** Status metadata — recreation of packages/ui status-badge.tsx STATUS_META. */
export const STATUS_META = {
  queued: { label: "Queued", tone: "neutral", icon: "circle-dashed" },
  provisioning: { label: "Provisioning", tone: "info", icon: "loader", spin: true },
  running: { label: "Running", tone: "success", icon: "circle-dot" },
  active: { label: "Active", tone: "success", icon: "circle-dot" },
  healthy: { label: "Healthy", tone: "success", icon: "circle-check" },
  pausing: { label: "Pausing", tone: "warning", icon: "loader", spin: true },
  paused: { label: "Paused", tone: "warning", icon: "circle-pause" },
  resuming: { label: "Resuming", tone: "info", icon: "loader", spin: true },
  deploying: { label: "Deploying", tone: "info", icon: "loader", spin: true },
  stopped: { label: "Stopped", tone: "neutral", icon: "ban" },
  inactive: { label: "Inactive", tone: "neutral", icon: "ban" },
  deleting: { label: "Deleting", tone: "danger", icon: "trash-2" },
  deleted: { label: "Deleted", tone: "neutral", icon: "circle-x" },
  degraded: { label: "Degraded", tone: "warning", icon: "circle-dashed" },
  failed: { label: "Failed", tone: "danger", icon: "circle-x" },
  error: { label: "Error", tone: "danger", icon: "circle-x" },
};

/**
 * Lifecycle status pill. Communicates state with icon + text + tone — never color alone —
 * for sandboxes, agents, and health indicators.
 */
export const StatusBadge = React.forwardRef(function StatusBadge({ status, label, size = "md", ...props }, ref) {
  const meta = STATUS_META[status] || STATUS_META.error;
  return (
    <Badge ref={ref} tone={meta.tone} size={size} icon={<Icon name={meta.icon} size={size === "sm" ? 12 : 14} spin={meta.spin} />} {...props}>
      {label != null ? label : meta.label}
    </Badge>
  );
});
