import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button, Input, Textarea } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { CopyButton, Field, Modal, PageHeader } from "../../components/primitives";
import { MarketplaceCard } from "../../components/marketplace";
import { useApi, useMutation, useResource } from "../../api/provider";
import type {
  AgentPackage,
  CreateSandboxInput,
  GeneratedRecipe,
  MarketplaceRecipe,
} from "../../api/types";
import { CreateSandboxSheet } from "./CreateSandboxSheet";

const GENERATED_KEY = "agentpop.generated-recipes.v1";

function readGenerated(): GeneratedRecipe[] {
  try {
    return JSON.parse(window.localStorage.getItem(GENERATED_KEY) ?? "[]") as GeneratedRecipe[];
  } catch {
    return [];
  }
}

function saveGenerated(recipes: GeneratedRecipe[]) {
  window.localStorage.setItem(GENERATED_KEY, JSON.stringify(recipes));
}

export function Marketplace() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { client, refresh } = useApi();
  const runMutation = useMutation();
  const initialKind = params.get("kind");
  const [kind, setKind] = React.useState<"all" | "agent" | "sandbox">(
    initialKind === "agent" || initialKind === "sandbox" ? initialKind : "all",
  );
  const [q, setQ] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [promptKind, setPromptKind] = React.useState<"agent" | "sandbox">(
    initialKind === "agent" ? "agent" : "sandbox",
  );
  const [generated, setGenerated] = React.useState<GeneratedRecipe | null>(null);
  const [generatedRecipes, setGeneratedRecipes] = React.useState<GeneratedRecipe[]>(readGenerated);
  const [generatedFiles, setGeneratedFiles] = React.useState<NonNullable<GeneratedRecipe["files"]>>([]);
  const [generatedFile, setGeneratedFile] = React.useState("Dockerfile");
  const [generating, setGenerating] = React.useState(false);
  const [building, setBuilding] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [deploy, setDeploy] = React.useState<MarketplaceRecipe | null>(null);
  const [inspect, setInspect] = React.useState<MarketplaceRecipe | null>(null);
  const [inspectFile, setInspectFile] = React.useState("Dockerfile");
  const { data: recipes = [], reload } = useResource(
    (c) => c.listMarketplace({ q, kind }),
    [q, kind],
  );
  const { data: templates = [], reload: reloadTemplates } = useResource((c) => c.listTemplates(), []);

  const catalogBuilding = recipes.some((recipe) => recipe.installState === "building" || recipe.installState === "queued");
  const customBuilding = templates.some((template) => template.status === "building" || template.status === "queued");
  React.useEffect(() => {
    if (!catalogBuilding && !customBuilding) return undefined;
    const timer = window.setInterval(() => {
      void reload();
      void reloadTemplates();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [catalogBuilding, customBuilding, reload, reloadTemplates]);

  const setFilter = (next: "all" | "agent" | "sandbox") => {
    setKind(next);
    if (next === "all") params.delete("kind");
    else params.set("kind", next);
    setParams(params, { replace: true });
  };

  const customPackages: AgentPackage[] = generatedRecipes
    .filter((recipe) => kind === "all" || recipe.kind === kind)
    .filter((recipe) => !q || `${recipe.name} ${recipe.tagline} ${recipe.category}`.toLowerCase().includes(q.toLowerCase()))
    .map((recipe) => {
      const template = templates.find((candidate) => candidate.name === recipe.id);
      return {
        ...recipe,
        installed: template?.status === "ready" && !template.deprecated,
        installState: template?.status ?? "draft",
        selfHost: "Save this Dockerfile and build it with Docker, or build it in AgentPop.",
        templateId: template?.id,
        imageRef: template?.imageRef,
      };
    });

  const generate = async () => {
    if (prompt.trim().length < 3) return;
    setGenerating(true);
    setFormError("");
    try {
      const recipe = await client.generateMarketplaceRecipe({ prompt: prompt.trim(), kind: promptKind });
      const files = recipe.files?.length
        ? recipe.files
        : [{ path: "Dockerfile", language: "dockerfile", content: recipe.definition }];
      setGenerated(recipe);
      setGeneratedFiles(files);
      setGeneratedFile(files[0]?.path ?? "Dockerfile");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  };

  const buildGenerated = async () => {
    if (!generated) return;
    setBuilding(true);
    setFormError("");
    try {
      const dockerfile = generatedFiles.find((file) => file.path === "Dockerfile")?.content ?? generated.definition;
      const created = await client.createTemplate({
        name: generated.id,
        description: generated.tagline,
        definition: dockerfile,
      });
      await client.buildTemplate(created.id);
      const saved = [{
        ...generated,
        definition: dockerfile,
        files: generatedFiles.map((file) => file.path === "Dockerfile" ? { ...file, content: dockerfile } : file),
      }, ...generatedRecipes.filter((item) => item.id !== generated.id)];
      setGeneratedRecipes(saved);
      saveGenerated(saved);
      setGenerated(null);
      setPrompt("");
      refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setBuilding(false);
    }
  };

  const createSandbox = async (input: CreateSandboxInput) => {
    if (!deploy) return;
    const custom = generatedRecipes.some((item) => item.id === deploy.id);
    const sandbox = await runMutation((c) => custom
      ? c.createSandbox({ ...input, kind: deploy.kind, recipeId: deploy.id })
      : c.deployMarketplaceRecipe(deploy.id, input));
    setDeploy(null);
    navigate(`/app/sandboxes/${sandbox.id}`);
  };

  return (
    <>
      <PageHeader
        title="Image marketplace"
        desc="Reusable agent and sandbox images. Inspect the files, fork the source, then deploy a persistent or ephemeral isolated computer."
      >
        <Button leadingIcon={<Icon name="plus" />} onClick={() => navigate("/app/sandboxes?create=1")}>
          Blank computer
        </Button>
      </PageHeader>

      <div className="panel" style={{ marginBottom: 18, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="ricon" style={{ width: 38, height: 38 }}><Icon name="sparkles" size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 16px/22px var(--font-sans)" }}>Create a programmable image</div>
            <div style={{ font: "12px/18px var(--font-sans)", color: "var(--text-secondary)", marginTop: 2 }}>
              A configured model interprets your intent using AgentPop reference images, then generates a reviewable Dockerfile, manifest, README, inputs, and validation plan. You approve every file before a build runs.
            </div>
          </div>
          <div className="seg">
            <button className={promptKind === "sandbox" ? "active" : ""} onClick={() => setPromptKind("sandbox")}>Sandbox</button>
            <button className={promptKind === "agent" ? "active" : ""} onClick={() => setPromptKind("agent")}>Agent</button>
          </div>
        </div>
        <div style={{ position: "relative", marginTop: 14 }}>
          <Textarea
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: A Python data-analysis sandbox with pandas, NumPy, requests, jq, and ripgrep"
            style={{ paddingRight: 150 }}
          />
          <Button
            loading={generating}
            disabled={prompt.trim().length < 3}
            leadingIcon={<Icon name="wand-sparkles" />}
            onClick={generate}
            style={{ position: "absolute", right: 10, bottom: 10 }}
          >
            Generate image
          </Button>
        </div>
        {formError && !generated ? <div className="help err" style={{ marginTop: 8 }}>{formError}</div> : null}
      </div>

      <div className="toolbar">
        <div className="seg">
          {(["all", "agent", "sandbox"] as const).map((value) => (
            <button key={value} className={kind === value ? "active" : ""} onClick={() => setFilter(value)}>
              {value === "all" ? "All" : value === "agent" ? "Agents" : "Sandboxes"}
            </button>
          ))}
        </div>
        <div style={{ width: 320 }}>
          <Input leading={<Icon name="search" />} placeholder="Search images" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <span className="spacer" />
        <Badge tone="outline">{recipes.length + customPackages.length} images</Badge>
      </div>

      <div className="rows">
        {customPackages.map((recipe) => (
          <MarketplaceCard
            key={`custom-${recipe.id}`}
            pkg={recipe}
            primaryLabel="Deploy"
            onInstall={() => {
              const source = generatedRecipes.find((item) => item.id === recipe.id);
              if (!source) return;
              void runMutation(async (c) => {
                const created = await c.createTemplate({ name: source.id, description: source.tagline, definition: source.definition });
                return c.buildTemplate(created.id);
              });
            }}
            onPrimary={() => setDeploy(recipe)}
            onInspect={() => { setInspect(recipe); setInspectFile("Dockerfile"); }}
          />
        ))}
        {recipes.map((recipe) => (
          <MarketplaceCard
            key={recipe.id}
            pkg={recipe}
            primaryLabel="Deploy"
            onInstall={() => {
              void runMutation((c) => c.installMarketplaceRecipe(recipe.id))
                .then(() => reload())
                .catch((error: unknown) => window.alert(error instanceof Error ? error.message : String(error)));
            }}
            onPrimary={() => setDeploy(recipe)}
            onInspect={() => { setInspect(recipe); setInspectFile("Dockerfile"); }}
          />
        ))}
      </div>

      {generated ? (
        <Modal
          title="Review generated image"
          desc={`${generated.generatedBy} · nothing builds or runs until you approve the complete source bundle.`}
          width={760}
          onClose={() => { setGenerated(null); setGeneratedFiles([]); setFormError(""); }}
          footer={
            <>
              <Badge tone="outline">{generated.kind}</Badge>
              <Badge tone="outline">{generatedFiles.length} files</Badge>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setGenerated(null)}>Cancel</Button>
              <Button loading={building} leadingIcon={<Icon name="hammer" />} onClick={buildGenerated}>
                {building ? "Starting build…" : "Approve & build"}
              </Button>
            </>
          }
        >
          <Field label="Image name">
            <Input value={generated.id} disabled mono />
          </Field>
          <div className="seg" style={{ marginBottom: 10 }}>
            {generatedFiles.map((file) => (
              <button
                key={file.path}
                className={generatedFile === file.path ? "active" : ""}
                onClick={() => setGeneratedFile(file.path)}
              >
                {file.path}
              </button>
            ))}
          </div>
          {generatedFiles.filter((file) => file.path === generatedFile).map((file) => (
            <Field
              key={file.path}
              label={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{file.path} <CopyButton text={file.content} /></span>}
              help={file.path === "Dockerfile"
                ? "Executable image source. The build service accepts AgentPop's single-stage FROM + RUN subset."
                : "Portable source metadata generated from the same intent. Review and edit it before approving the image."}
            >
              <Textarea
                mono
                rows={file.path === "README.md" ? 15 : 12}
                value={file.content}
                onChange={(event) => setGeneratedFiles((current) => current.map((candidate) => (
                  candidate.path === file.path ? { ...candidate, content: event.target.value } : candidate
                )))}
              />
            </Field>
          ))}
          {(generated.credentials?.length || generated.requiredConnectors?.length || generated.ports?.length) ? (
            <div className="grantnote" style={{ alignItems: "flex-start", marginTop: 10 }}>
              <Icon name="key-round" size={16} />
              <div>
                {generated.credentials?.length ? <div><strong>Optional secrets:</strong> {generated.credentials.map((item) => item.name).join(", ")}</div> : null}
                {generated.requiredConnectors?.length ? <div><strong>Connectors:</strong> {generated.requiredConnectors.join(", ")}</div> : null}
                {generated.ports?.length ? <div><strong>Suggested ports:</strong> {generated.ports.join(", ")}</div> : null}
                <div style={{ marginTop: 4 }}>The image can deploy without secrets; add or rotate them later.</div>
              </div>
            </div>
          ) : null}
          {formError ? <div className="help err">{formError}</div> : null}
        </Modal>
      ) : null}

      {inspect ? (
        <Modal
          title={`${inspect.name} image source`}
          desc="Everything required to reproduce, fork, self-host, or create this image through the API."
          width={760}
          onClose={() => setInspect(null)}
          footer={
            <>
              <Badge tone={inspect.kind === "agent" ? "accent" : "outline"}>{inspect.kind} image</Badge>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setInspect(null)}>Close</Button>
              <Button
                leadingIcon={<Icon name="git-fork" />}
                onClick={() => {
                  const forked: GeneratedRecipe = {
                    id: `${inspect.id}-fork`.slice(0, 32),
                    kind: inspect.kind,
                    name: `${inspect.name} fork`,
                    tagline: inspect.tagline,
                    description: `Fork of ${inspect.name}`,
                    category: inspect.category,
                    useCases: inspect.useCases,
                    definition: inspect.definition,
                    generatedBy: "image-fork",
                    credentials: inspect.credentials,
                    files: inspect.files,
                    persistenceModes: inspect.persistenceModes,
                    defaultCommand: inspect.defaultCommand,
                    requiredConnectors: inspect.requiredConnectors,
                  };
                  setGenerated(forked);
                  const files = inspect.files?.length
                    ? inspect.files
                    : [{ path: "Dockerfile", language: "dockerfile", content: inspect.definition }];
                  setGeneratedFiles(files);
                  setGeneratedFile(files[0]?.path ?? "Dockerfile");
                  setInspect(null);
                }}
              >
                Fork image
              </Button>
            </>
          }
        >
          <div className="seg" style={{ marginBottom: 12 }}>
            {(inspect.files?.length ? inspect.files : [{ path: "Dockerfile", content: inspect.definition }]).map((file) => (
              <button key={file.path} className={inspectFile === file.path ? "active" : ""} onClick={() => setInspectFile(file.path)}>{file.path}</button>
            ))}
          </div>
          <pre style={{ whiteSpace: "pre-wrap", maxHeight: 440, overflow: "auto", background: "var(--code-bg)", color: "var(--code-fg)", borderRadius: 10, padding: 16 }}>
            {(inspect.files?.find((file) => file.path === inspectFile)?.content) ?? inspect.definition}
          </pre>
          {inspect.credentials?.length ? (
            <div className="grantnote" style={{ marginTop: 12 }}>
              <Icon name="key-round" size={16} />
              <span>{inspect.credentials.map((credential) => credential.name).join(", ")} can be supplied during deployment or added later. Deployment is never blocked by a missing model key.</span>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {deploy ? (
        <CreateSandboxSheet
          initialImage={deploy.id}
          initialKind={deploy.kind}
          recipeId={deploy.id}
          requiredSecret={deploy.requiredSecret}
          onClose={() => setDeploy(null)}
          onCreate={createSandbox}
        />
      ) : null}
    </>
  );
}
