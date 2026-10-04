import * as React from "react";
import {
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Loader,
  Trash2,
  CircleDot,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeProps } from "./badge";
import { cn } from "../lib/utils";

export type LifecycleStatus =
  // sandbox
  | "queued"
  | "provisioning"
  | "running"
  | "pausing"
  | "paused"
  | "resuming"
  | "deleting"
  | "deleted"
  | "failed"
  // agent
  | "deploying"
  | "stopped"
  // generic
  | "active"
  | "inactive"
  | "healthy"
  | "degraded"
  | "error";

type StatusMeta = {
  label: string;
  tone: NonNullable<BadgeProps["tone"]>;
  icon: LucideIcon;
  /** Animate the icon (in-progress states). */
  spin?: boolean;
};

export const STATUS_META: Record<LifecycleStatus, StatusMeta> = {
  queued: { label: "Queued", tone: "neutral", icon: CircleDashed },
  provisioning: { label: "Provisioning", tone: "info", icon: Loader, spin: true },
  running: { label: "Running", tone: "success", icon: CircleDot },
  active: { label: "Active", tone: "success", icon: CircleDot },
  healthy: { label: "Healthy", tone: "success", icon: CircleCheck },
  pausing: { label: "Pausing", tone: "warning", icon: Loader, spin: true },
  paused: { label: "Paused", tone: "warning", icon: CirclePause },
  resuming: { label: "Resuming", tone: "info", icon: Loader, spin: true },
  deploying: { label: "Deploying", tone: "info", icon: Loader, spin: true },
  stopped: { label: "Stopped", tone: "neutral", icon: Ban },
  inactive: { label: "Inactive", tone: "neutral", icon: Ban },
  deleting: { label: "Deleting", tone: "danger", icon: Trash2 },
  deleted: { label: "Deleted", tone: "neutral", icon: CircleX },
  degraded: { label: "Degraded", tone: "warning", icon: CircleDashed },
  failed: { label: "Failed", tone: "danger", icon: CircleX },
  error: { label: "Error", tone: "danger", icon: CircleX },
};

export interface StatusBadgeProps extends Omit<BadgeProps, "tone" | "icon" | "children"> {
  status: LifecycleStatus;
  /** Override the default label. */
  label?: string;
}

/**
 * Lifecycle status pill. Communicates state with icon + shape + text + tone —
 * never color alone — for sandboxes, agents, and health indicators.
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, size, className, ...props }, ref) => {
    const meta = STATUS_META[status];
    const Icon = meta.icon;
    return (
      <Badge
        ref={ref}
        tone={meta.tone}
        size={size}
        className={className}
        icon={<Icon className={cn(meta.spin && "animate-spin")} aria-hidden />}
        {...props}
      >
        {label ?? meta.label}
      </Badge>
    );
  },
);
StatusBadge.displayName = "StatusBadge";
