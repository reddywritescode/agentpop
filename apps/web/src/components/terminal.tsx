import * as React from "react";
import { Button } from "@agentpop/ui";
import { Icon } from "./icon";
import { useMutation } from "../api/provider";
import type { Sandbox } from "../api/types";

/**
 * Buffered-exec terminal against a sandbox runtime. Shared by the sandbox
 * detail page and the agent detail page (an agent's terminal runs commands in
 * its own managed sandbox).
 */
export function Terminal({ sb, label }: { sb: Sandbox; label?: string }) {
  const runMutation = useMutation();
  const prompt = label ?? sb.name;
  const [hist, setHist] = React.useState<{ cmd?: string; out?: string }[]>([
    { out: "Connected to " + prompt + " · commands execute in the sandbox runtime" },
  ]);
  const [val, setVal] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const inp = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  });
  const run = async (cmd: string) => {
    const c = cmd.trim();
    if (c === "clear") {
      setHist([]);
      return;
    }
    if (c === "" || running) return;
    setHist((h) => h.concat({ cmd: c }));
    setRunning(true);
    try {
      const result = await runMutation((client) => client.execSandbox(sb.id, c));
      const output = result.stdout + result.stderr;
      setHist((h) =>
        h.concat({
          out: output.replace(/\n$/, "") || `[exit ${result.exitCode} · ${result.durationMs} ms]`,
        }),
      );
    } catch (error) {
      setHist((h) => h.concat({ out: `request failed: ${error instanceof Error ? error.message : String(error)}` }));
    } finally {
      setRunning(false);
      window.setTimeout(() => inp.current?.focus(), 0);
    }
  };
  if (sb.status !== "running")
    return (
      <div className="term" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#8f8b83" }}>
          {sb.status === "paused"
            ? "Runtime is paused — resume to attach a shell."
            : sb.status === "failed"
              ? "Runtime failed — no shell available. See Events."
              : "Shell attaches once the runtime is running…"}
          {sb.status === "paused" ? (
            <div style={{ marginTop: 14 }}>
              <Button size="sm" leadingIcon={<Icon name="play" />} onClick={() => void runMutation((c) => c.resumeSandbox(sb.id))}>Resume</Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="chip"><Icon name="cable" size={12} />POST …/v1/sandboxes/{sb.id.slice(0, 11)}/exec</span>
        <span className="chip">buffered exec</span>
        <span className="spacer" />
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="eraser" />} onClick={() => setHist([])}>Clear</Button>
      </div>
      <div className="term ap-scroll" ref={box} onClick={() => inp.current?.focus()}>
        {hist.map((l, i) =>
          l.cmd !== undefined ? (
            <div key={i}><span className="p">user@{prompt}</span>:<span className="path">~</span>$ {l.cmd}</div>
          ) : (
            <div key={i} style={{ whiteSpace: "pre-wrap" }}>{l.out}</div>
          ),
        )}
        <div className="in">
          <span className="p">user@{prompt}</span>:<span className="path">~</span>$&nbsp;
          <input
            ref={inp}
            value={val}
            autoFocus
            spellCheck={false}
            aria-label="Terminal input"
            disabled={running}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void run(val);
                setVal("");
              }
            }}
          />
          {running ? <span style={{ color: "#8f8b83" }}>running…</span> : null}
        </div>
      </div>
    </>
  );
}
