import { Badge, Button, StatusBadge } from "@agentpop/ui";
import { Icon } from "./icon";
import { CopyButton } from "./primitives";
import type { AgentPackage } from "../api/types";

/**
 * One marketplace row shared by the agent catalog and the sandbox-image
 * catalog. Install always maps to a real template build; the primary action
 * (Deploy / New sandbox) is supplied by the page.
 */
export function MarketplaceCard({
  pkg,
  primaryLabel,
  onInstall,
  onPrimary,
  onInspect,
}: {
  pkg: AgentPackage;
  primaryLabel: string;
  onInstall: () => void;
  onPrimary: () => void;
  onInspect?: () => void;
}) {
  const building = pkg.installState === "building" || pkg.installState === "queued";
  return (
    <div className="rrow">
      <div className="rrow-main" style={{ alignItems: "flex-start" }}>
        <span className="ricon"><Icon name={pkg.kind === "sandbox" ? "box" : "package"} size={17} /></span>
        <div className="rcol" style={{ minWidth: 0, flex: 1 }}>
          <div className="rname">{pkg.name} <Badge tone="outline" size="sm">{pkg.category}</Badge></div>
          <div style={{ font: "13px/18px var(--font-sans)", color: "var(--text-secondary)", margin: "2px 0 4px" }}>{pkg.tagline}</div>
          <div className="rmeta">
            {pkg.useCases.slice(0, 4).map((u) => <span key={u}>{u}</span>)}
            {pkg.license ? <span>{pkg.license}</span> : null}
            {pkg.heavyBuild ? <span>large build</span> : null}
            {pkg.imageRef ? <span className="mono">{pkg.imageRef}</span> : null}
          </div>
        </div>
        <span className="spacer" />
        <StatusBadge
          status={pkg.installed ? "healthy" : building ? "queued" : pkg.installState === "failed" ? "failed" : "paused"}
          label={pkg.installed ? "Installed" : building ? "Building" : pkg.installState === "failed" ? "Build failed" : "Not installed"}
        />
        <div className="racts">
          <CopyButton text={pkg.definition} />
          {onInspect ? <Button size="sm" variant="ghost" onClick={onInspect}>View files</Button> : null}
          {pkg.installed ? (
            <Button size="sm" onClick={onPrimary}>{primaryLabel}</Button>
          ) : (
            <Button size="sm" variant="secondary" loading={building} onClick={onInstall}>
              {building ? "Building image…" : pkg.installState === "failed" ? "Retry build" : "Build image"}
            </Button>
          )}
          {pkg.sourceUrl ? (
            <Button variant="ghost" size="icon-sm" aria-label="Source" title={pkg.sourceUrl} onClick={() => window.open(pkg.sourceUrl, "_blank", "noopener")}><Icon name="external-link" size={15} /></Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
