import * as React from "react";
import { Badge, Button, Input, StatusBadge, Textarea } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Field, Modal, PageHeader } from "../../components/primitives";
import { useApi, useMutation, useResource } from "../../api/provider";
import type { Template, TemplateBuild } from "../../api/types";

const DEFAULT_DOCKERFILE = `FROM agentpop/devbox:local

# Add packages you want available in every sandbox booted from this image.
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ripgrep jq sqlite3 \\
 && rm -rf /var/lib/apt/lists/*`;

const statusTone = (template: Template): { status: "healthy" | "failed" | "queued" | "paused"; label: string } => {
  if (template.deprecated) return { status: "paused", label: "Deprecated" };
  switch (template.status) {
    case "ready":
      return { status: "healthy", label: "Build ok" };
    case "failed":
      return { status: "failed", label: "Build failed" };
    case "building":
    case "queued":
      return { status: "queued", label: "Building" };
    case "draft":
      return { status: "queued", label: "Draft" };
    default:
      return { status: "queued", label: "Planned" };
  }
};

export function Templates() {
  const { data: templates = [], reload } = useResource((c) => c.listTemplates(), []);
  const { client, refresh } = useApi();
  const runMutation = useMutation();
  const [modal, setModal] = React.useState(false);
  const [logsFor, setLogsFor] = React.useState<Template | null>(null);
  const [name, setName] = React.useState("");
  const [definition, setDefinition] = React.useState(DEFAULT_DOCKERFILE);
  const [formError, setFormError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const building = templates.some((t) => t.status === "building" || t.status === "queued");
  React.useEffect(() => {
    if (!building) return undefined;
    const timer = window.setInterval(() => reload(), 2000);
    return () => window.clearInterval(timer);
  }, [building, reload]);

  const closeCreate = () => {
    setModal(false);
    setFormError("");
    setSubmitting(false);
  };

  return (
    <>
      <PageHeader title="Templates" desc="Reusable sandbox images built from a Dockerfile definition.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>New template</Button>
      </PageHeader>
      <div className="rows">
        {templates.map((t) => {
          const tone = statusTone(t);
          const custom = t.source === "custom";
          return (
            <div className="rrow" key={t.id}>
              <div className="rrow-main">
                <span className="ricon"><Icon name="layers" size={17} /></span>
                <div className="rcol">
                  <div className="rname">{t.name}</div>
                  <div className="rmeta">
                    <span>{t.arch}</span>
                    <span>{t.size}</span>
                    <span>used by {t.used} sandbox{t.used === 1 ? "" : "es"}</span>
                    {t.imageRef ? <span className="mono">{t.imageRef}</span> : null}
                  </div>
                </div>
                <span className="spacer" />
                <Badge tone="outline" size="sm">{t.versionLabel}</Badge>
                <StatusBadge status={tone.status} label={tone.label} />
                <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{t.updated}</span>
                <div className="racts">
                  {custom ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Build"
                      title={t.deprecated ? "Restore the template before rebuilding" : t.status === "building" ? "Build in progress" : "Start build"}
                      disabled={t.deprecated || t.status === "building" || t.status === "queued"}
                      onClick={() => {
                        void runMutation((c) => c.buildTemplate(t.id)).catch((err: unknown) => {
                          window.alert(err instanceof Error ? err.message : String(err));
                        });
                      }}
                    ><Icon name="hammer" size={15} /></Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Build logs"
                    title={custom ? "Build logs" : "Built-in catalog entry"}
                    onClick={() => setLogsFor(t)}
                  ><Icon name="scroll-text" size={15} /></Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.deprecated ? "Restore" : "Deprecate"}
                    title={
                      !custom
                        ? "Built-in templates cannot be deprecated"
                        : t.deprecated
                          ? "Restore for new sandboxes"
                          : "Deprecate: block new sandboxes, keep existing ones"
                    }
                    disabled={!custom}
                    onClick={() => {
                      void runMutation((c) => (t.deprecated ? c.restoreTemplate(t.id) : c.deprecateTemplate(t.id))).catch((err: unknown) => {
                        window.alert(err instanceof Error ? err.message : String(err));
                      });
                    }}
                  ><Icon name={t.deprecated ? "rotate-ccw" : "ban"} size={15} /></Button>
                  {custom ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      title={t.used > 0 ? "Destroy dependent sandboxes before deleting" : "Delete template and image"}
                      disabled={t.used > 0 || t.status === "building"}
                      onClick={() => {
                        if (window.confirm(`Delete template ${t.name} and its image?`)) {
                          void runMutation((c) => c.deleteTemplate(t.id)).catch((err: unknown) => {
                            window.alert(err instanceof Error ? err.message : String(err));
                          });
                        }
                      }}
                    ><Icon name="trash-2" size={15} /></Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modal ? (
        <Modal
          title="Create template"
          desc="Build a reusable sandbox image from FROM + RUN instructions."
          onClose={closeCreate}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={closeCreate}>Cancel</Button>
              <Button
                disabled={!name || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setFormError("");
                  try {
                    const created = await client.createTemplate({ name, definition });
                    await client.buildTemplate(created.id);
                    refresh();
                    setModal(false);
                    setName("");
                    setDefinition(DEFAULT_DOCKERFILE);
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >{submitting ? "Starting build…" : "Build template"}</Button>
            </>
          }
        >
          <Field label="Name" help="Lowercase letters, digits and dashes only.">
            <Input placeholder="my-toolbox" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Dockerfile" help="Single stage: FROM an agentpop/* base image plus RUN steps. COPY/ADD are not supported.">
            <Textarea mono rows={8} value={definition} onChange={(event) => setDefinition(event.target.value)} />
          </Field>
          {formError ? <div className="help err">{formError}</div> : null}
        </Modal>
      ) : null}
      {logsFor ? <BuildLogsModal template={logsFor} onClose={() => setLogsFor(null)} /> : null}
    </>
  );
}

function BuildLogsModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const active = template.status === "building" || template.status === "queued";
  const { data: builds = [], loading, error, reload } = useResource(
    (c) => (template.source === "custom" ? c.listTemplateBuilds(template.id) : Promise.resolve<TemplateBuild[]>([])),
    [template.id],
  );
  React.useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => reload(), 2000);
    return () => window.clearInterval(timer);
  }, [active, reload]);
  const latest = builds[0];
  return (
    <Modal
      title={`${template.name}:${template.versionLabel} build logs`}
      desc={template.source === "custom" ? "Persisted logs from the data-plane build sandbox." : "Immutable catalog entry from the image pipeline."}
      onClose={onClose}
      footer={<><span className="spacer" /><Button variant="secondary" onClick={onClose}>Close</Button></>}
    >
      <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0, maxHeight: 360, overflowY: "auto" }}>
        {template.source !== "custom"
          ? `status=${template.status}\narchitecture=${template.arch}\nimage=${template.imageRef ?? "n/a"}\nsource=built-in catalog`
          : loading
            ? "Loading build history…"
            : error
              ? `Failed to load builds: ${error.message}`
              : !latest
                ? "No builds yet. Start a build to see logs here."
                : [
                    `build=${latest.id} status=${latest.status} version=v${latest.version}`,
                    latest.imageRef ? `image=${latest.imageRef}` : null,
                    latest.error ? `error=${latest.error}` : null,
                    "",
                    ...latest.logs.map((entry) => `[${entry.stream}] ${entry.line}`),
                  ]
                    .filter((line): line is string => line !== null)
                    .join("\n")}
      </pre>
    </Modal>
  );
}
