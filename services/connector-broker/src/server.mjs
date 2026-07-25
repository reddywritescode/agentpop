import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Composio } from "@composio/core";

const address = process.env.CONNECTOR_BROKER_ADDR || "0.0.0.0:7070";
const statePath =
  process.env.CONNECTOR_BROKER_STATE ||
  "/var/lib/agentpop/connector-broker/state.json";
const brokerToken = process.env.CONNECTOR_BROKER_TOKEN || "";
const composioApiKey = process.env.COMPOSIO_API_KEY?.trim() || "";
const [host, portText] = address.includes(":")
  ? address.split(":")
  : ["0.0.0.0", address];
const port = Number(portText);

let state = { pending: {}, connections: {}, catalog: null };
let saveChain = Promise.resolve();
let composio;

function now() {
  return new Date().toISOString();
}

function keyFor(ownerId, toolkit) {
  return `${ownerId}:${toolkit}`;
}

function normalizeToolkit(value) {
  const toolkit = String(value || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,80}$/.test(toolkit)) {
    throw new Error("invalid toolkit slug");
  }
  return toolkit;
}

function requiredString(value, name, max = 500) {
  const result = String(value || "").trim();
  if (!result || result.length > max) throw new Error(`${name} is required`);
  return result;
}

function getComposio() {
  if (!composioApiKey) throw new Error("COMPOSIO_API_KEY is not configured");
  composio ||= new Composio({ apiKey: composioApiKey, allowTracking: false });
  return composio;
}

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8"));
    state = {
      pending: parsed.pending || {},
      connections: parsed.connections || {},
      catalog: parsed.catalog || null,
    };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (removePendingConnections()) await persistState();
}

async function persistState() {
  const snapshot = JSON.stringify(state, null, 2);
  saveChain = saveChain.then(async () => {
    await mkdir(dirname(statePath), { recursive: true, mode: 0o700 });
    const temporary = `${statePath}.${process.pid}.tmp`;
    await writeFile(temporary, snapshot, { mode: 0o600 });
    await rename(temporary, statePath);
    await chmod(statePath, 0o600);
  });
  return saveChain;
}

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJSON(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 2_000_000) throw new Error("request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function authorized(request) {
  if (!brokerToken) return false;
  return request.headers.authorization === `Bearer ${brokerToken}`;
}

function publicConnection(connection) {
  return {
    toolkit: connection.toolkit,
    status: connection.status,
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
  };
}

function removePendingConnections(ownerId, toolkit) {
  let changed = false;
  const cutoff = Date.now() - 15 * 60_000;
  for (const [id, pending] of Object.entries(state.pending)) {
    const expired = new Date(pending.createdAt).getTime() < cutoff;
    const matches =
      ownerId &&
      toolkit &&
      pending.ownerId === ownerId &&
      pending.toolkit === toolkit;
    if (expired || matches) {
      delete state.pending[id];
      changed = true;
    }
  }
  return changed;
}

function parseMcpResponse(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  for (const line of trimmed.split(/\r?\n/).reverse()) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      return JSON.parse(payload);
    } catch {}
  }
  return null;
}

async function mcpRpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-api-key": composioApiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      ...(params ? { params } : {}),
    }),
  });
  const raw = await response.text();
  const parsed = parseMcpResponse(raw);
  if (!response.ok || !parsed) {
    throw new Error(`Composio MCP ${method} failed with HTTP ${response.status}`);
  }
  if (parsed.error) throw new Error(parsed.error.message || `Composio MCP ${method} failed`);
  return parsed.result;
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string"
        ? item
        : item?.name ?? item?.slug ?? item?.id ?? item?.type,
    )
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());
}

function normalizeCatalogToolkit(item) {
  const meta = item?.meta || {};
  const slug = String(item?.slug ?? item?.key ?? "").toLowerCase();
  return {
    slug,
    name: String(item?.name ?? slug),
    description: String(meta.description ?? item?.description ?? ""),
    logoUrl:
      meta.logoUrl ??
      meta.logo_url ??
      meta.logo ??
      item?.logoUrl ??
      item?.logo,
    categories: stringArray(meta.categories ?? item?.categories),
    authSchemes: stringArray(
      item?.authSchemes ?? item?.auth_schemes ?? meta.authSchemes ?? meta.auth_schemes,
    ),
    toolsCount: Number(
      meta.toolsCount ??
        meta.tools_count ??
        item?.toolsCount ??
        item?.tools_count ??
        0,
    ),
  };
}

function normalizeCatalogTool(item) {
  const slug = String(item?.slug ?? item?.name ?? "").toUpperCase();
  return {
    slug,
    name: String(item?.name ?? slug),
    description: String(item?.description ?? ""),
    toolkit: String(item?.toolkit?.slug ?? item?.toolkit_slug ?? "").toLowerCase(),
    inputSchema:
      item?.inputParameters ??
      item?.input_parameters ??
      item?.parameters ??
      { type: "object", properties: {} },
    tags: stringArray(item?.tags),
    scopes: stringArray(item?.scopes),
    version: String(item?.version ?? item?.toolkit?.version ?? "latest"),
  };
}

async function catalog(searchParams) {
  const cached = state.catalog;
  const fresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < 5 * 60_000;
  let source = fresh ? "cache" : "live";
  if (!fresh && composioApiKey) {
    try {
      const listed = await getComposio().client.toolkits.list({ limit: 1000 });
      const raw = Array.isArray(listed) ? listed : listed?.items || [];
      const items = raw
        .map(normalizeCatalogToolkit)
        .filter((item) => item.slug && item.name)
        .sort(
          (a, b) =>
            b.toolsCount - a.toolsCount || a.name.localeCompare(b.name),
        );
      state.catalog = { fetchedAt: now(), items };
      await persistState();
    } catch (error) {
      if (!cached) throw error;
      source = "stale-cache";
    }
  }
  const all = state.catalog?.items || [];
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || 1000), 1),
    1000,
  );
  const filtered = query
    ? all.filter((item) =>
        [
          item.slug,
          item.name,
          item.description,
          ...item.categories,
          ...item.authSchemes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : all;
  return {
    configured: Boolean(composioApiKey),
    source: composioApiKey ? source : cached ? "stale-cache" : "none",
    fetchedAt: state.catalog?.fetchedAt,
    total: all.length,
    items: filtered.slice(0, limit),
  };
}

async function toolkitTools(toolkit, searchParams) {
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || 1000), 1),
    1000,
  );
  const listed = await getComposio().tools.getRawComposioTools({
    toolkits: [normalizeToolkit(toolkit)],
    important: false,
    limit: 1000,
  });
  const all = listed
    .map(normalizeCatalogTool)
    .filter((item) => item.slug)
    .sort((a, b) => a.name.localeCompare(b.name));
  const filtered = query
    ? all.filter((item) =>
        [item.slug, item.name, item.description, ...item.tags, ...item.scopes]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : all;
  return {
    configured: Boolean(composioApiKey),
    toolkit: normalizeToolkit(toolkit),
    total: all.length,
    items: filtered.slice(0, limit),
  };
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/healthz") {
    return json(response, 200, {
      healthy: true,
      configured: Boolean(composioApiKey),
      stateStore: statePath,
    });
  }
  if (!authorized(request)) {
    return json(response, 401, { error: "unauthorized", message: "broker token required" });
  }

  if (request.method === "GET" && url.pathname === "/v1/catalog") {
    return json(response, 200, await catalog(url.searchParams));
  }

  const toolsMatch = url.pathname.match(/^\/v1\/catalog\/([^/]+)\/tools$/);
  if (request.method === "GET" && toolsMatch) {
    return json(
      response,
      200,
      await toolkitTools(decodeURIComponent(toolsMatch[1]), url.searchParams),
    );
  }

  if (request.method === "GET" && url.pathname === "/v1/status") {
    const ownerId = requiredString(url.searchParams.get("ownerId"), "ownerId", 200);
    const connections = Object.values(state.connections)
      .filter((item) => item.ownerId === ownerId)
      .map(publicConnection);
    return json(response, 200, {
      configured: Boolean(composioApiKey),
      connected: connections.some((item) => item.status === "success"),
      connections,
    });
  }

  if (request.method === "POST" && url.pathname === "/v1/authorize") {
    const body = await readJSON(request);
    const ownerId = requiredString(body.ownerId, "ownerId", 200);
    const toolkit = normalizeToolkit(body.toolkit);
    removePendingConnections(ownerId, toolkit);
    const callbackUrl = new URL(requiredString(body.callbackUrl, "callbackUrl", 2000));
    const session = await getComposio().create(ownerId, {
      toolkits: [toolkit],
      workbench: { enable: false },
    });
    if (!session.sessionId || !session.mcp?.url) {
      throw new Error("Composio did not return a usable session MCP URL");
    }
    const pendingId = `cmp_${randomUUID().replaceAll("-", "")}`;
    callbackUrl.searchParams.set("state", pendingId);
    const authorization = await session.authorize(toolkit, {
      callbackUrl: callbackUrl.toString(),
    });
    if (!authorization.redirectUrl) {
      throw new Error("Composio did not return a Connect Link");
    }
    state.pending[pendingId] = {
      id: pendingId,
      ownerId,
      toolkit,
      sessionId: session.sessionId,
      mcpUrl: session.mcp.url,
      connectionRequestId: authorization.id,
      createdAt: now(),
    };
    await persistState();
    return json(response, 201, {
      pendingId,
      toolkit,
      authorizationUrl: authorization.redirectUrl,
      expiresInSeconds: 900,
    });
  }

  if (request.method === "POST" && url.pathname === "/v1/complete") {
    const body = await readJSON(request);
    const pendingId = requiredString(body.state, "state", 200);
    const pending = state.pending[pendingId];
    if (!pending) {
      return json(response, 404, {
        error: "missing_pending_connection",
        message: "OAuth state is missing or has already been consumed",
      });
    }
    delete state.pending[pendingId];
    if (Date.now() - new Date(pending.createdAt).getTime() > 15 * 60_000) {
      await persistState();
      return json(response, 410, {
        error: "expired_pending_connection",
        message: "OAuth state expired before the callback completed",
      });
    }
    const status = body.status === "success" ? "success" : "failed";
    if (status === "success" && !String(body.connectedAccountId || "").trim()) {
      await persistState();
      return json(response, 400, {
        error: "missing_connected_account",
        message: "Successful OAuth callback did not include a connected account ID",
      });
    }
    if (status === "success") {
      const upstream = await getComposio().connectedAccounts.get(
        String(body.connectedAccountId).trim(),
      );
      if (
        upstream.status !== "ACTIVE" ||
        upstream.is_disabled ||
        upstream.toolkit?.slug !== pending.toolkit ||
        (upstream.user_id && upstream.user_id !== pending.ownerId)
      ) {
        await persistState();
        return json(response, 400, {
          error: "invalid_connected_account",
          message: "Composio account does not match the pending owner/toolkit or is not active",
        });
      }
    }
    const connection = {
      ownerId: pending.ownerId,
      toolkit: pending.toolkit,
      sessionId: pending.sessionId,
      mcpUrl: pending.mcpUrl,
      connectedAccountId: body.connectedAccountId || undefined,
      status,
      connectedAt: status === "success" ? now() : undefined,
      updatedAt: now(),
    };
    state.connections[keyFor(pending.ownerId, pending.toolkit)] = connection;
    await persistState();
    return json(response, 200, publicConnection(connection));
  }

  if (request.method === "POST" && url.pathname === "/v1/invoke") {
    const body = await readJSON(request);
    const ownerId = requiredString(body.ownerId, "ownerId", 200);
    const toolkit = normalizeToolkit(body.toolkit);
    const toolSlug = requiredString(body.toolSlug, "toolSlug", 160).toUpperCase();
    const connection = state.connections[keyFor(ownerId, toolkit)];
    if (!connection || connection.status !== "success") {
      return json(response, 409, {
        error: "connector_not_connected",
        message: `${toolkit} is not connected`,
      });
    }
    const result = await mcpRpc(connection.mcpUrl, "tools/call", {
      name: "COMPOSIO_MULTI_EXECUTE_TOOL",
      arguments: {
        tools: [{ tool_slug: toolSlug, arguments: body.arguments || {} }],
        thought: body.thought || `Invoke ${toolSlug} through AgentPop`,
        current_step: body.currentStep || "EXECUTING_CONNECTOR_TOOL",
        current_step_metric: body.currentStepMetric || "1/1 tool",
      },
    });
    return json(response, 200, { toolkit, toolSlug, result });
  }

  if (request.method === "POST" && url.pathname === "/v1/revoke") {
    const body = await readJSON(request);
    const ownerId = requiredString(body.ownerId, "ownerId", 200);
    const toolkit = normalizeToolkit(body.toolkit);
    const stateKey = keyFor(ownerId, toolkit);
    const connection = state.connections[stateKey];
    const removedPending = removePendingConnections(ownerId, toolkit);
    if (!connection) {
      if (removedPending) await persistState();
      response.writeHead(204);
      return response.end();
    }
    if (connection.connectedAccountId && composioApiKey) {
      await getComposio().connectedAccounts.delete(connection.connectedAccountId);
    }
    delete state.connections[stateKey];
    await persistState();
    response.writeHead(204);
    return response.end();
  }

  return json(response, 404, { error: "not_found", message: "route not found" });
}

await loadState();

createServer((request, response) => {
  route(request, response).catch((error) => {
    console.error("connector-broker", error);
    const status =
      error?.message === "COMPOSIO_API_KEY is not configured" ? 503 : 400;
    json(response, status, {
      error: status === 503 ? "platform_not_configured" : "broker_request_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  });
}).listen(port, host, () => {
  console.log(
    `connector-broker listen=${address} configured=${Boolean(composioApiKey)} state=${statePath}`,
  );
});
