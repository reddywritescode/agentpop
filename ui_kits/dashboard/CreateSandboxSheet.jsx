const { Button, Icon, Input } = window.AgentPopDesignSystem_47afa4;

function CreateSandboxSheet({ onClose, onCreate }) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState(d.sizes[2].id);
  const [preview, setPreview] = React.useState(true);
  const [previewMode, setPreviewMode] = React.useState("public");
  const [idle, setIdle] = React.useState(false);
  const [idleAfter, setIdleAfter] = React.useState("after 15 min");
  const [image, setImage] = React.useState("devbox:1");
  const [disk, setDisk] = React.useState("10 GB");
  const [envs, setEnvs] = React.useState([{ k: "", v: "" }]);
  const [creating, setCreating] = React.useState(false);
  const invalid = name !== "" && !/^[a-z0-9-]{1,22}$/.test(name);

  const create = () => {
    if (invalid) return;
    setCreating(true);
    const s = d.sizes.find((x) => x.id === size);
    setTimeout(() => { onCreate({ name: name || "sandbox-" + Math.random().toString(36).slice(2, 7), size: s.cpu + " · " + s.ram, template: image, disk, idle: idle ? "pause " + idleAfter : "no idle pause" }); }, 900);
  };

  return (
    <Sheet title="Create sandbox" desc="An isolated Firecracker microVM." onClose={onClose}
      footer={<React.Fragment>
        <span className="est"><b>0.0023 cr/sec</b> · 8.284 cr/hr estimated<br />{size} · 10 GB disk</span>
        <span className="spacer"></span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={creating} onClick={create}>{creating ? "Creating…" : "Create sandbox"}</Button>
      </React.Fragment>}>
      <Field label="Name" optional help={invalid ? "Only lowercase letters, digits, and hyphens." : "Lowercase letters, digits, hyphens. Max 22 chars."} error={invalid}>
        <Input placeholder="my-sandbox" value={name} invalid={invalid} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Region">
        <Select options={["us-east", "eu-central"]} defaultValue="us-east" />
      </Field>
      <Field label="Size">
        <div className="sizegrid">
          {d.sizes.map((s) => (
            <div key={s.id} className={"sizecard" + (size === s.id ? " sel" : "")} onClick={() => setSize(s.id)} role="radio" aria-checked={size === s.id}>
              <div className="t">{s.id}</div>
              <div className="d"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="cpu" size={13} />{s.cpu}</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="memory-stick" size={13} />{s.ram}</span></div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Image">
        <Select options={["devbox:1", "python-ml:3", "node-lts:2", "custom-cuda:1"]} value={image} onChange={(e) => setImage(e.target.value)} />
      </Field>
      <Field label="Disk">
        <Select options={["5 GB", "10 GB", "20 GB", "40 GB"]} value={disk} onChange={(e) => setDisk(e.target.value)} />
      </Field>
      <div className="optrow">
        <Check on={preview} onChange={setPreview} label="Public preview" />
        <div style={{ flex: 1 }}>
          <div className="t">Public preview URL</div>
          <div className="d">Expose ports over HTTPS so apps inside are reachable from anywhere.</div>
          {preview ? (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {["public", "organization", "signed-link"].map((m) => (
                <Button key={m} size="sm" variant={previewMode === m ? "primary" : "outline"} onClick={() => setPreviewMode(m)}>{m}</Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="optrow">
        <Check on={idle} onChange={setIdle} label="Pause when idle" />
        <div style={{ flex: 1 }}>
          <div className="t">Pause when idle</div>
          <div className="d">Stop the sandbox automatically after a stretch with no activity. You can resume it any time.</div>
          {idle ? <div style={{ marginTop: 8, maxWidth: 180 }}><Select options={["after 5 min", "after 15 min", "after 1 h"]} value={idleAfter} onChange={(e) => setIdleAfter(e.target.value)} /></div> : null}
        </div>
      </div>
      <Field label="Allowed egress" optional help="Empty = allow everything. Hosts, IPs, CIDRs, domain wildcards.">
        <Input mono placeholder="pypi.org, github.com:443, 1.1.1.1" />
      </Field>
      <Field label="Environment variables" optional>
        {envs.map((e, i) => (
          <div className="kv" key={i}>
            <Input mono placeholder="KEY" style={{ flex: 1 }} />
            <Input mono placeholder="value" style={{ flex: 1.4 }} />
            <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => setEnvs(envs.filter((_, j) => j !== i))}><Icon name="trash-2" size={14} /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setEnvs([...envs, { k: "", v: "" }])}>Add variable</Button>
      </Field>
    </Sheet>
  );
}

Object.assign(window, { CreateSandboxSheet });
