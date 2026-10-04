import * as React from "react";
import { Button, Input, Select } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Check, Field, Sheet } from "../../components/primitives";
import { useResource } from "../../api/provider";
import type { CreateSandboxInput } from "../../api/types";

export function CreateSandboxSheet({
  onClose,
  onCreate,
  initialImage,
  initialKind = "sandbox",
  recipeId,
  requiredSecret,
}: {
  onClose: () => void;
  onCreate: (input: CreateSandboxInput) => Promise<void> | void;
  initialImage?: string;
  initialKind?: "agent" | "sandbox";
  recipeId?: string;
  requiredSecret?: string;
}) {
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const { data: templates = [] } = useResource((c) => c.listTemplates(), []);
  const sizes = catalog?.sizes ?? [];
  // "devbox:1" is the built-in base; every ready custom template (including
  // installed marketplace images) is directly bootable by name.
  const imageOptions = [
    "devbox:1",
    ...templates.filter((t) => t.source === "custom" && t.status === "ready" && !t.deprecated).map((t) => t.name),
  ];
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState("");
  const [preview, setPreview] = React.useState(true);
  const [previewPort, setPreviewPort] = React.useState("8080");
  const [previewMode, setPreviewMode] = React.useState<"public" | "organization" | "signed-link">("public");
  const [idle, setIdle] = React.useState(false);
  const [idleAfter, setIdleAfter] = React.useState("after 15 min");
  const [lifecycle, setLifecycle] = React.useState<"persistent" | "ephemeral">("persistent");
  const [expiresAfter, setExpiresAfter] = React.useState("1 hour");
  const [region, setRegion] = React.useState("us-east");
  const [image, setImage] = React.useState(initialImage ?? "devbox:1");
  const [disk, setDisk] = React.useState("10 GB");
  const [envs, setEnvs] = React.useState<{ k: string; v: string }[]>([{ k: "", v: "" }]);
  const [secrets, setSecrets] = React.useState<{ k: string; v: string }[]>(
    requiredSecret ? [{ k: requiredSecret, v: "" }] : [{ k: "", v: "" }],
  );
  const [egress, setEgress] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (!size && sizes[2]) setSize(sizes[2].id);
  }, [sizes, size]);

  const invalid = name !== "" && !/^[a-z0-9-]{1,22}$/.test(name);
  const selected = sizes.find((s) => s.id === size);
  const create = async () => {
    if (invalid || !selected) return;
    setCreating(true);
    try {
      const idleSeconds = idleAfter === "after 5 min" ? 300 : idleAfter === "after 1 h" ? 3600 : 900;
      const environment = Object.fromEntries(
        envs
          .map(({ k, v }) => [k.trim().toUpperCase(), v] as const)
          .filter(([k]) => /^[A-Z_][A-Z0-9_]*$/.test(k)),
      );
      const secretValues = Object.fromEntries(
        secrets
          .map(({ k, v }) => [k.trim().toUpperCase(), v] as const)
          .filter(([k, v]) => /^[A-Z_][A-Z0-9_]*$/.test(k) && v !== ""),
      );
      await onCreate({
        name: name || undefined,
        kind: initialKind,
        recipeId,
        size: selected.id,
        template: image,
        disk,
        region,
        publicWeb: preview,
        previewPort: preview ? Number.parseInt(previewPort, 10) || 8080 : undefined,
        previewMode,
        pauseWhenIdle: idle,
        idleTimeoutSec: idle ? idleSeconds : 0,
        lifecycle,
        ttlSeconds: lifecycle === "ephemeral"
          ? expiresAfter === "15 minutes" ? 900 : expiresAfter === "6 hours" ? 21600 : 3600
          : 0,
        allowedEgress: egress.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean),
        environment,
        secrets: secretValues,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet
      title="Create sandbox"
      desc="An isolated Firecracker microVM."
      onClose={onClose}
      footer={
        <>
          <span className="est"><b>AgentPop Pro · $20/month</b><br />{selected ? `${selected.cpu} · ${selected.ram}` : ""} · {disk} disk</span>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={invalid || !selected} loading={creating} onClick={create}>
            {creating ? "Creating…" : "Create sandbox"}
          </Button>
        </>
      }
    >
      <Field
        label="Name"
        optional
        help={invalid ? "Only lowercase letters, digits, and hyphens." : "Lowercase letters, digits, hyphens. Max 22 chars."}
        error={invalid}
      >
        <Input placeholder="my-sandbox" value={name} invalid={invalid} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Region">
        <Select options={["us-east", "eu-central"]} value={region} onChange={(event) => setRegion(event.target.value)} />
      </Field>
      <Field label="Size">
        <div className="sizegrid">
          {sizes.map((s) => (
            <div
              key={s.id}
              className={"sizecard" + (size === s.id ? " sel" : "")}
              onClick={() => setSize(s.id)}
              role="radio"
              aria-checked={size === s.id}
            >
              <div className="t">{s.id}</div>
              <div className="d">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="cpu" size={13} />{s.cpu}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="memory-stick" size={13} />{s.ram}</span>
              </div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Image" help="Installed marketplace images and built templates boot with their toolchain preloaded.">
        <Select options={imageOptions} value={image} onChange={(e) => setImage(e.target.value)} />
      </Field>
      <Field label="Disk">
        <Select options={["5 GB", "10 GB", "20 GB", "40 GB"]} value={disk} onChange={(e) => setDisk(e.target.value)} />
      </Field>
      <Field label="Lifecycle" help="Persistent computers remain until deleted. Ephemeral computers automatically expire.">
        <div className="seg">
          <button className={lifecycle === "persistent" ? "active" : ""} onClick={() => setLifecycle("persistent")}>Persistent</button>
          <button className={lifecycle === "ephemeral" ? "active" : ""} onClick={() => setLifecycle("ephemeral")}>Ephemeral</button>
        </div>
        {lifecycle === "ephemeral" ? (
          <div style={{ marginTop: 8, maxWidth: 180 }}>
            <Select options={["15 minutes", "1 hour", "6 hours"]} value={expiresAfter} onChange={(e) => setExpiresAfter(e.target.value)} />
          </div>
        ) : null}
      </Field>
      <div className="optrow">
        <Check on={preview} onChange={setPreview} label="Public preview" />
        <div style={{ flex: 1 }}>
          <div className="t">Public preview URL</div>
          <div className="d">Expose ports over HTTPS so apps inside are reachable from anywhere.</div>
          {preview ? (
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div style={{ maxWidth: 160 }}>
                <Input
                  mono
                  aria-label="Preview port"
                  value={previewPort}
                  onChange={(event) => setPreviewPort(event.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="8080"
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["public", "organization", "signed-link"] as const).map((m) => (
                  <Button key={m} size="sm" variant={previewMode === m ? "primary" : "outline"} onClick={() => setPreviewMode(m)}>{m}</Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="optrow">
        <Check on={idle} onChange={setIdle} label="Pause when idle" />
        <div style={{ flex: 1 }}>
          <div className="t">Pause when idle</div>
          <div className="d">Stop the sandbox automatically after a stretch with no activity. You can resume it any time.</div>
          {idle ? (
            <div style={{ marginTop: 8, maxWidth: 180 }}>
              <Select options={["after 5 min", "after 15 min", "after 1 h"]} value={idleAfter} onChange={(e) => setIdleAfter(e.target.value)} />
            </div>
          ) : null}
        </div>
      </div>
      <Field label="Allowed egress" optional help="Empty = allow everything. Hosts, IPs, CIDRs, domain wildcards.">
        <Input mono value={egress} onChange={(event) => setEgress(event.target.value)} placeholder="pypi.org, github.com:443, 1.1.1.1" />
      </Field>
      <Field label="Environment variables" optional>
        {envs.map((env, i) => (
          <div className="kv" key={i}>
            <Input
              mono
              placeholder="KEY"
              value={env.k}
              onChange={(event) => setEnvs(envs.map((item, j) => j === i ? { ...item, k: event.target.value } : item))}
              style={{ flex: 1 }}
            />
            <Input
              mono
              placeholder="value"
              value={env.v}
              onChange={(event) => setEnvs(envs.map((item, j) => j === i ? { ...item, v: event.target.value } : item))}
              style={{ flex: 1.4 }}
            />
            <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => setEnvs(envs.filter((_, j) => j !== i))}>
              <Icon name="trash-2" size={14} />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setEnvs([...envs, { k: "", v: "" }])}>Add variable</Button>
      </Field>
      <Field
        label="Secrets"
        optional
        help={requiredSecret ? `${requiredSecret} is recommended, but you may deploy now and add it later in sandbox settings. Values are encrypted and never returned by the API.` : "Optional at deploy time. Encrypted at rest, injected at boot, and returned by name only."}
      >
        {secrets.map((secret, i) => (
          <div className="kv" key={`${secret.k}-${i}`}>
            <Input
              mono
              placeholder="OPENAI_API_KEY"
              value={secret.k}
              disabled={Boolean(requiredSecret && secret.k === requiredSecret)}
              onChange={(event) => setSecrets(secrets.map((item, j) => j === i ? { ...item, k: event.target.value } : item))}
              style={{ flex: 1 }}
            />
            <Input
              mono
              type="password"
              placeholder="secret value"
              value={secret.v}
              onChange={(event) => setSecrets(secrets.map((item, j) => j === i ? { ...item, v: event.target.value } : item))}
              style={{ flex: 1.4 }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove secret"
              disabled={false}
              onClick={() => setSecrets(secrets.filter((_, j) => j !== i))}
            >
              <Icon name="trash-2" size={14} />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setSecrets([...secrets, { k: "", v: "" }])}>Add secret</Button>
      </Field>
    </Sheet>
  );
}
