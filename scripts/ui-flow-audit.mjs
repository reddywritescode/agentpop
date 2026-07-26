#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const BASE = process.env.AGENTPOP_BASE_URL ?? "http://127.0.0.1:8088";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "acceptance-evidence", "ui");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "owner@agentpop.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "agentpop-local-owner";

fs.mkdirSync(OUT, { recursive: true });

const results = [];
const routeInventory = [];
let sandboxId = "";
let agentName = `ui-agent-${Date.now().toString(36).slice(-6)}`;

function safe(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function add(id, status, surface, detail, evidence = {}) {
  results.push({ id, status, surface, detail, evidence, verifiedAt: new Date().toISOString() });
  console.log(`${status.padEnd(10)} ${id.padEnd(30)} ${detail}`);
}

async function api(method, pathname, body) {
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer agentpop-local-api-token",
      "idempotency-key": `ui-${Date.now()}-${Math.random()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${pathname}: ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : undefined;
}

async function wait(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(450);
}

async function screenshot(page, name) {
  const file = path.join(OUT, `${safe(name)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(ROOT, file);
}

async function inventory(page, id, route, expected) {
  await page.goto(`${BASE}${route}`);
  await wait(page);
  const titleFound = await page.getByText(expected, { exact: false }).first().isVisible().catch(() => false);
  const controls = await page.locator("button, a, input, select, textarea, [role=button], [role=tab], [role=radio]").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((node, index) => ({
        index,
        tag: node.tagName.toLowerCase(),
        type: node.getAttribute("type"),
        role: node.getAttribute("role"),
        name:
          node.getAttribute("aria-label") ||
          node.getAttribute("title") ||
          node.getAttribute("placeholder") ||
          node.textContent?.replace(/\s+/g, " ").trim() ||
          "",
        disabled: "disabled" in node ? Boolean(node.disabled) : false,
      })),
  );
  const shot = await screenshot(page, `${id}-${safe(expected)}`);
  routeInventory.push({ id, route, expected, titleFound, controlCount: controls.length, controls, screenshot: shot });
  add(id, titleFound ? "PASS" : "FAIL", route, `${expected} route rendered with ${controls.length} visible controls`, {
    screenshot: shot,
    controls: controls.length,
  });
}

async function action(page, id, route, surface, run, assert, detail) {
  try {
    await page.goto(`${BASE}${route}`);
    await wait(page);
    const before = await screenshot(page, `${id}-before`);
    await run();
    await page.waitForTimeout(250);
    await assert();
    const after = await screenshot(page, `${id}-after`);
    add(id, "PASS", surface, detail, { before, after });
  } catch (error) {
    const failed = await screenshot(page, `${id}-failed`).catch(() => "");
    add(id, "FAIL", surface, error instanceof Error ? error.message : String(error), { screenshot: failed });
  }
}

async function noEffect(page, id, route, buttonName, detail) {
  try {
    await page.goto(`${BASE}${route}`);
    await wait(page);
    const button = page.getByRole("button", { name: buttonName }).first();
    if (await button.isDisabled()) {
      const shot = await screenshot(page, `${id}-disabled-boundary`);
      add(id, "PASS", route, `${buttonName} is correctly disabled in the current state`, { screenshot: shot });
      return;
    }
    const beforeUrl = page.url();
    const beforeText = await page.locator("body").innerText();
    let requests = 0;
    const count = (request) => {
      if (request.resourceType() === "fetch" || request.resourceType() === "xhr") requests += 1;
    };
    page.on("request", count);
    await button.click();
    await page.waitForTimeout(350);
    page.off("request", count);
    const afterText = await page.locator("body").innerText();
    const changed = beforeUrl !== page.url() || beforeText !== afterText || requests > 0;
    const shot = await screenshot(page, `${id}-${changed ? "changed" : "no-effect"}`);
    add(id, changed ? "PASS" : "FAIL", route, changed ? `${buttonName} produced an observable action` : detail, {
      requests,
      screenshot: shot,
    });
  } catch (error) {
    add(id, "FAIL", route, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}`);
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => {
    localStorage.setItem(
      "agentpop.session",
      JSON.stringify({ name: "qa", email: "qa@agentpop.test", org: "qa-org", project: "acceptance" }),
    );
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);

  try {
    const sandbox = await api("POST", "/v1/sandboxes", {
      name: `ui-box-${Date.now().toString(36).slice(-6)}`,
      vcpu: 0.25,
      memoryMb: 512,
      diskGb: 10,
      environment: { UI_AUDIT: "1" },
    });
    sandboxId = sandbox.id;
    await api("POST", "/v1/agents", {
      name: agentName,
      model: "provider/model",
      vcpu: 0.25,
      memoryMb: 512,
      diskGb: 5,
    });

    const publicRoutes = [
      ["UI-PUB-001", "/", "Run untrusted and agent-generated code"],
      ["UI-PUB-002", "/signin", "Welcome back"],
      ["UI-PUB-003", "/signup", "Create your account"],
    ];
    const customerRoutes = [
      ["UI-OVR-001", "/app/overview", "Overview"],
      ["UI-MKT-001", "/app/marketplace", "Image marketplace"],
      ["UI-SBX-001", "/app/sandboxes", "Sandboxes"],
      ["UI-SBD-001", `/app/sandboxes/${sandboxId}`, "Sandboxes"],
      ["UI-CON-001", "/app/connectors", "Connectors"],
      ["UI-DEV-001", "/app/developer", "Developer"],
      ["UI-SET-001", "/app/settings", "Settings"],
      ["UI-COMPAT-AGENT", "/app/agents", "Image marketplace"],
      ["UI-COMPAT-TEMPLATE", "/app/templates", "Image marketplace"],
    ];
    for (const [id, route, expected] of [...publicRoutes, ...customerRoutes]) {
      await inventory(page, id, route, expected);
    }

    await action(
      page,
      "UI-MKT-FILTER",
      "/app/marketplace",
      "marketplace",
      () => page.getByRole("button", { name: "Agents", exact: true }).click(),
      async () => {
        await page.waitForURL("**/app/marketplace?kind=agent");
        const filter = page.getByRole("button", { name: "Agents", exact: true });
        await filter.locator("xpath=self::*[contains(concat(' ', normalize-space(@class), ' '), ' active ')]").waitFor();
        await page.getByText(/^\d+ images$/).waitFor();
        await page.locator(".rows").waitFor();
      },
      "Agent filter updates the unified image marketplace",
    );
    await action(
      page,
      "UI-MKT-SEARCH",
      "/app/marketplace",
      "marketplace",
      async () => {
        await page.getByPlaceholder("Search images").fill("Base agent computer");
      },
      async () => {
        const rows = page.locator(".rrow");
        await rows.filter({ hasText: "Base agent computer" }).waitFor();
        if ((await rows.count()) !== 1) throw new Error("Image search did not narrow the catalog to one matching row");
      },
      "Search narrows the unified image marketplace without changing image kind",
    );
    await action(
      page,
      "UI-MKT-GENERATE",
      "/app/marketplace",
      "marketplace",
      async () => {
        await page
          .getByPlaceholder("Example: A Python data-analysis sandbox with pandas, NumPy, requests, jq, and ripgrep")
          .fill("A Python data sandbox with pandas, NumPy, requests, jq, and ripgrep");
        await page.getByRole("button", { name: "Generate image" }).click();
      },
      async () => {
        await page.getByRole("heading", { name: "Review generated image" }).waitFor();
        await page.getByText(/model:/, { exact: false }).waitFor();
        await page.getByRole("button", { name: "Dockerfile", exact: true }).waitFor();
        await page.getByRole("button", { name: "agentpop.yaml", exact: true }).waitFor();
        await page.getByRole("button", { name: "README.md", exact: true }).waitFor();
        await page.getByRole("button", { name: "Cancel" }).last().click();
      },
      "Prompt produces a model-generated, reviewable multi-file image before build",
    );
    await action(
      page,
      "UI-MKT-SOURCE",
      "/app/marketplace?kind=sandbox",
      "marketplace",
      async () => {
        const row = page.locator(".rrow").filter({ hasText: "Base agent computer" });
        await row.getByRole("button", { name: "View files", exact: true }).click();
      },
      async () => {
        await page.getByRole("heading", { name: "Base agent computer image source" }).waitFor();
        await page.getByRole("button", { name: "Dockerfile", exact: true }).waitFor();
        await page.getByRole("button", { name: "agentpop.yaml", exact: true }).waitFor();
        await page.getByRole("button", { name: "README.md", exact: true }).waitFor();
        await page.getByRole("button", { name: "Fork image", exact: true }).waitFor();
      },
      "Curated image exposes portable source files and a fork action",
    );
    await action(
      page,
      "UI-MKT-DEPLOY",
      "/app/marketplace?kind=sandbox",
      "marketplace",
      async () => {
        const row = page.locator(".rrow").filter({ hasText: "Base agent computer" });
        await row.getByRole("button", { name: "Deploy", exact: true }).click();
      },
      async () => {
        await page.getByRole("heading", { name: "Create sandbox" }).waitFor();
        await page.getByText("Persistent computers remain until deleted", { exact: false }).waitFor();
        await page.getByText("Optional at deploy time", { exact: false }).waitFor();
      },
      "Image deploy exposes persistent/ephemeral lifecycle and optional write-only secrets",
    );
    await action(
      page,
      "UI-MKT-BLANK",
      "/app/marketplace",
      "marketplace",
      () => page.getByRole("button", { name: "Blank computer" }).click(),
      async () => {
        await page.getByRole("heading", { name: "Create sandbox" }).waitFor();
        await page.getByRole("button", { name: "Cancel" }).click();
      },
      "Blank computer opens the same runtime creation sheet",
    );
    await action(
      page,
      "UI-SBX-NEW",
      "/app/sandboxes",
      "sandboxes",
      () => page.getByRole("button", { name: "New sandbox" }).first().click(),
      async () => {
        await page.getByRole("heading", { name: "Create sandbox" }).waitFor();
        await page.getByText("$20/month", { exact: false }).waitFor();
        await page.getByRole("button", { name: "Cancel" }).click();
      },
      "Create sandbox sheet opens with fixed subscription copy and cancels",
    );
    await action(
      page,
      "UI-SBX-TERMINAL",
      `/app/sandboxes/${sandboxId}?tab=terminal`,
      "sandbox terminal",
      async () => {
        const input = page.getByRole("textbox", { name: "Terminal input" });
        await input.fill("printf ui-terminal-ok");
        await input.press("Enter");
      },
      async () => page.getByText("ui-terminal-ok", { exact: true }).waitFor({ timeout: 15_000 }),
      "Terminal button executes through the real runtime",
    );
    for (const [id, label, expected] of [
      ["UI-SBX-LOGS", "Logs", "ui-terminal-ok"],
      ["UI-SBX-FILES", "Files", "/workspace"],
      ["UI-SBX-METRICS", "Metrics", "CPU"],
      ["UI-SBX-EVENTS", "Events", "sandbox.create"],
      ["UI-SBX-SETTINGS", "Settings", "Apply configuration"],
    ]) {
      await action(
        page,
        id,
        `/app/sandboxes/${sandboxId}`,
        "sandbox detail tabs",
        () => page.getByRole("button", { name: label, exact: true }).click(),
        async () => page.getByText(expected, { exact: false }).first().waitFor(),
        `${label} tab renders`,
      );
    }

    await action(
      page,
      "UI-CON-TEST",
      "/app/connectors",
      "connectors",
      async () => {
        const test = page.getByRole("button", { name: "Test tool" }).first();
        if (await test.count()) await test.click();
        else throw new Error("No live connector is available for the exact broker-path test");
      },
      async () => {
        await page.getByText("exact broker path used by agents", { exact: false }).waitFor();
        await page.getByRole("button", { name: "Close" }).last().click();
      },
      "Connected provider exposes the real broker-path test dialog",
    );
    await action(
      page,
      "UI-DEV-KEY",
      "/app/developer",
      "developer",
      () => page.getByRole("button", { name: /Create.*key/i }).first().click(),
      async () => {
        await page.getByText("Create API key", { exact: false }).first().waitFor();
        await page.getByRole("button", { name: "Cancel" }).last().click();
      },
      "Scoped API-key dialog opens and cancels",
    );

    for (const name of ["TypeScript", "Python", "Go", "CLI"]) {
      await action(
        page,
        `UI-DEV-SDK-${safe(name)}`,
        "/app/developer",
        "developer SDK tabs",
        () => page.getByRole("button", { name, exact: true }).first().click(),
        async () => page.getByRole("button", { name, exact: true }).first().waitFor(),
        `${name} SDK tab is selectable`,
      );
    }
    for (const name of ["Project", "Members", "Subscription", "Quotas"]) {
      await action(
        page,
        `UI-SET-TAB-${safe(name)}`,
        "/app/settings",
        "settings tabs",
        () => page.getByRole("button", { name, exact: true }).click(),
        async () => page.getByRole("button", { name, exact: true }).waitFor(),
        `${name} settings tab is selectable`,
      );
    }

    await page.goto(`${BASE}/app/overview`);
    await wait(page);
    const sidebar = await page.locator("aside").innerText();
    const forbidden = ["Services", "Applications", "Credits", "Add credits"].filter((label) => sidebar.includes(label));
    add(
      "UI-EXCLUSIONS",
      forbidden.length === 0 ? "PASS" : "FAIL",
      "customer navigation",
      forbidden.length === 0
        ? "Services, Applications, and credits are absent from the customer navigation"
        : `Excluded customer surfaces are still visible: ${forbidden.join(", ")}`,
      { screenshot: await screenshot(page, "ui-customer-navigation-exclusions") },
    );

    await page.goto(`${BASE}/admin/login`);
    await wait(page);
    await page.getByLabel("Owner email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in to operations" }).click();
    await page.waitForURL("**/admin/overview");
    add("UI-ADM-LOGIN", "PASS", "/admin/login", "Owner login reached the operator console", {
      screenshot: await screenshot(page, "ui-admin-login"),
    });
    for (const [id, route, expected] of [
      ["UI-ADM-OVR", "/admin/overview", "Operations overview"],
      ["UI-ADM-CP", "/admin/control-plane", "Control plane"],
      ["UI-ADM-DP", "/admin/data-plane", "Data plane"],
      ["UI-ADM-SBX", "/admin/sandboxes", "Runtime inventory"],
      ["UI-ADM-AUD", "/admin/audit", "Audit & operations"],
      ["UI-ADM-SET", "/admin/settings", "Private API configuration"],
    ]) {
      await inventory(page, id, route, expected);
    }

    fs.writeFileSync(path.join(OUT, "route-controls.json"), JSON.stringify(routeInventory, null, 2));
    fs.writeFileSync(path.join(OUT, "latest.json"), JSON.stringify({
      generatedAt: new Date().toISOString(),
      baseUrl: BASE,
      summary: {
        pass: results.filter((item) => item.status === "PASS").length,
        fail: results.filter((item) => item.status === "FAIL").length,
      },
      results,
    }, null, 2));
  } finally {
    if (agentName) await api("DELETE", `/v1/agents/${encodeURIComponent(agentName)}`).catch(() => undefined);
    if (sandboxId) await api("DELETE", `/v1/sandboxes/${encodeURIComponent(sandboxId)}`).catch(() => undefined);
    await browser.close();
  }

  const failures = results.filter((item) => item.status === "FAIL");
  console.log(`\nUI evidence: ${path.join(OUT, "latest.json")}`);
  console.log(`PASS=${results.length - failures.length} FAIL=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
