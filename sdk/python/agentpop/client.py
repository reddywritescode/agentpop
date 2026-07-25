from __future__ import annotations

import json
import os
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class AgentPopError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        code: str | None = None,
        request_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id


@dataclass
class Sandbox:
    _client: "AgentPopClient"
    _data: dict[str, Any]

    @property
    def id(self) -> str:
        return str(self._data["id"])

    @property
    def status(self) -> str:
        return str(self._data["status"])

    @property
    def data(self) -> dict[str, Any]:
        return dict(self._data)

    def refresh(self) -> "Sandbox":
        self._data = self._client._request("GET", f"/v1/sandboxes/{self.id}")
        return self

    def exec(
        self,
        command: str,
        *,
        timeout_seconds: int = 120,
        label: str | None = None,
    ) -> dict[str, Any]:
        return self._client._request(
            "POST",
            f"/v1/sandboxes/{self.id}/exec",
            {
                "command": command,
                "timeoutSeconds": timeout_seconds,
                **({"label": label} if label else {}),
            },
            timeout=max(self._client.timeout, timeout_seconds + 5),
        )

    def sh(self, command: str, *, timeout_seconds: int = 120) -> dict[str, Any]:
        result = self.exec(command, timeout_seconds=timeout_seconds)
        if result["exitCode"] != 0:
            raise AgentPopError(
                f"Command exited {result['exitCode']}\n"
                f"{result.get('stderr') or result.get('stdout') or ''}"
            )
        return result

    def ssh(self) -> dict[str, Any]:
        return self._client._request("GET", f"/v1/sandboxes/{self.id}/ssh")

    def logs(self, *, limit: int = 200) -> list[dict[str, Any]]:
        response = self._client._request(
            "GET", f"/v1/sandboxes/{self.id}/logs?limit={limit}"
        )
        return list(response["items"])

    def secrets(self) -> dict[str, Any]:
        """List write-only secret names and runtime application state."""
        return dict(
            self._client._request("GET", f"/v1/sandboxes/{self.id}/secrets")
        )

    def set_secrets(
        self,
        secrets: dict[str, str],
        *,
        replace: bool = False,
    ) -> dict[str, Any]:
        """Add or rotate sandbox secrets without rebuilding its image."""
        return dict(
            self._client._request(
                "PUT",
                f"/v1/sandboxes/{self.id}/secrets",
                {"secrets": secrets, "replace": replace},
            )
        )

    def delete_secret(self, name: str) -> dict[str, Any]:
        return dict(
            self._client._request(
                "DELETE",
                f"/v1/sandboxes/{self.id}/secrets/{quote(name, safe='')}",
            )
        )

    def list_files(self) -> list[dict[str, Any]]:
        return list(self._client._request("GET", f"/v1/sandboxes/{self.id}/files"))

    def upload_file(self, path: str, data: bytes) -> None:
        self._client._request_raw(
            "PUT",
            f"/v1/sandboxes/{self.id}/files?path={quote(path, safe='')}",
            data,
        )

    def download_file(self, path: str) -> bytes:
        return self._client._request_raw(
            "GET",
            f"/v1/sandboxes/{self.id}/files?path={quote(path, safe='')}",
        )

    def create_directory(self, path: str) -> None:
        self._client._request(
            "POST",
            f"/v1/sandboxes/{self.id}/directories",
            {"path": path},
        )

    def delete_file(self, path: str) -> None:
        self._client._request(
            "DELETE",
            f"/v1/sandboxes/{self.id}/files?path={quote(path, safe='')}",
        )

    def metrics(self) -> dict[str, Any]:
        return dict(
            self._client._request("GET", f"/v1/sandboxes/{self.id}/metrics")
        )

    def events(self) -> list[dict[str, Any]]:
        response = self._client._request(
            "GET", f"/v1/sandboxes/{self.id}/events"
        )
        return list(response["items"])

    def pause(self) -> "Sandbox":
        self._data = self._client._request("POST", f"/v1/sandboxes/{self.id}/pause", {})
        return self

    def resume(self) -> "Sandbox":
        self._data = self._client._request("POST", f"/v1/sandboxes/{self.id}/resume", {})
        return self

    def update(self, **patch: Any) -> "Sandbox":
        self._data = self._client._request(
            "PATCH", f"/v1/sandboxes/{self.id}", patch
        )
        return self

    def fork(self) -> "Sandbox":
        data = self._client._request(
            "POST", f"/v1/sandboxes/{self.id}:fork", {}
        )
        return Sandbox(self._client, data)

    def expose_port(self, port: int, mode: str = "public") -> "Sandbox":
        self._data = self._client._request(
            "POST", f"/v1/sandboxes/{self.id}/ports", {"port": port, "mode": mode}
        )
        return self

    def remove_port(self, port: int) -> "Sandbox":
        self._data = self._client._request(
            "DELETE", f"/v1/sandboxes/{self.id}/ports/{port}"
        )
        return self

    def destroy(self) -> None:
        self._client._request("DELETE", f"/v1/sandboxes/{self.id}")

    def __enter__(self) -> "Sandbox":
        return self

    def __exit__(self, *_: object) -> None:
        self.destroy()


class AgentPopClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 60,
    ) -> None:
        self.base_url = (
            base_url or os.environ.get("AGENTPOP_BASE_URL") or "http://127.0.0.1:8080"
        ).rstrip("/")
        self.api_key = api_key or os.environ.get("AGENTPOP_API_KEY")
        self.timeout = timeout

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        headers = {"Accept": "application/json"}
        payload = None
        if body is not None:
            payload = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if method != "GET":
            headers["Idempotency-Key"] = idempotency_key or str(uuid.uuid4())
        request = Request(
            f"{self.base_url}{path}",
            data=payload,
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=timeout or self.timeout) as response:
                if response.status == 204:
                    return None
                return json.loads(response.read())
        except HTTPError as error:
            request_id = error.headers.get("X-Request-ID")
            try:
                response = json.loads(error.read())
            except (json.JSONDecodeError, UnicodeDecodeError):
                response = {}
            raise AgentPopError(
                response.get("message") or f"HTTP {error.code}",
                status=error.code,
                code=response.get("error"),
                request_id=request_id,
            ) from error
        except URLError as error:
            raise AgentPopError(f"Could not reach AgentPop: {error.reason}") from error

    def _request_raw(
        self,
        method: str,
        path: str,
        data: bytes | None = None,
        *,
        timeout: float | None = None,
        idempotency_key: str | None = None,
    ) -> bytes:
        headers = {"Accept": "application/octet-stream"}
        if data is not None:
            headers["Content-Type"] = "application/octet-stream"
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if method != "GET":
            headers["Idempotency-Key"] = idempotency_key or str(uuid.uuid4())
        request = Request(
            f"{self.base_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=timeout or self.timeout) as response:
                return b"" if response.status == 204 else response.read()
        except HTTPError as error:
            request_id = error.headers.get("X-Request-ID")
            try:
                response = json.loads(error.read())
            except (json.JSONDecodeError, UnicodeDecodeError):
                response = {}
            raise AgentPopError(
                response.get("message") or f"HTTP {error.code}",
                status=error.code,
                code=response.get("error"),
                request_id=request_id,
            ) from error
        except URLError as error:
            raise AgentPopError(f"Could not reach AgentPop: {error.reason}") from error

    def create_sandbox(
        self,
        *,
        idempotency_key: str | None = None,
        **input: Any,
    ) -> Sandbox:
        data = self._request(
            "POST",
            "/v1/sandboxes",
            input,
            idempotency_key=idempotency_key,
        )
        return Sandbox(self, data)

    def get_sandbox(self, sandbox_id: str) -> Sandbox:
        return Sandbox(self, self._request("GET", f"/v1/sandboxes/{sandbox_id}"))

    def list_sandboxes(self) -> list[Sandbox]:
        response = self._request("GET", "/v1/sandboxes")
        return [Sandbox(self, item) for item in response["items"]]

    def list_marketplace(
        self,
        *,
        kind: str = "all",
        query: str = "",
    ) -> list[dict[str, Any]]:
        params: list[str] = []
        if kind and kind != "all":
            params.append(f"kind={quote(kind, safe='')}")
        if query:
            params.append(f"q={quote(query, safe='')}")
        suffix = f"?{'&'.join(params)}" if params else ""
        return list(self._request("GET", f"/v1/marketplace{suffix}")["items"])

    def generate_marketplace_recipe(
        self,
        prompt: str,
        *,
        kind: str = "sandbox",
        name: str = "",
    ) -> dict[str, Any]:
        """Generate a reviewable, allowlisted Dockerfile recipe."""
        return dict(
            self._request(
                "POST",
                "/v1/marketplace/generate",
                {"prompt": prompt, "kind": kind, "name": name},
            )
        )

    def install_marketplace_recipe(self, recipe_id: str) -> dict[str, Any]:
        """Build a curated recipe into an immutable sandbox image."""
        return dict(
            self._request(
                "POST",
                f"/v1/marketplace/{quote(recipe_id, safe='')}/install",
                {},
            )
        )

    def deploy_marketplace_recipe(
        self,
        recipe_id: str,
        *,
        idempotency_key: str | None = None,
        **input: Any,
    ) -> Sandbox:
        """Deploy an installed agent or environment recipe as a sandbox."""
        data = self._request(
            "POST",
            f"/v1/marketplace/{quote(recipe_id, safe='')}/deploy",
            input,
            idempotency_key=idempotency_key,
        )
        return Sandbox(self, data)

    def list_images(
        self,
        *,
        kind: str = "all",
        query: str = "",
    ) -> list[dict[str, Any]]:
        """List reusable agent and sandbox images with their source files."""
        params: list[str] = []
        if kind and kind != "all":
            params.append(f"kind={quote(kind, safe='')}")
        if query:
            params.append(f"q={quote(query, safe='')}")
        suffix = f"?{'&'.join(params)}" if params else ""
        return list(self._request("GET", f"/v1/images{suffix}")["items"])

    def generate_image(
        self,
        prompt: str,
        *,
        kind: str = "sandbox",
        name: str = "",
    ) -> dict[str, Any]:
        return dict(
            self._request(
                "POST",
                "/v1/images/generate",
                {"prompt": prompt, "kind": kind, "name": name},
            )
        )

    def get_image(self, image_id: str) -> dict[str, Any]:
        return dict(
            self._request("GET", f"/v1/images/{quote(image_id, safe='')}")
        )

    def build_image(self, image_id: str) -> dict[str, Any]:
        return dict(
            self._request(
                "POST", f"/v1/images/{quote(image_id, safe='')}/build", {}
            )
        )

    def fork_image(
        self,
        image_id: str,
        *,
        name: str,
        definition: str | None = None,
        build: bool = False,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"name": name, "build": build}
        if definition is not None:
            body["definition"] = definition
        return dict(
            self._request(
                "POST",
                f"/v1/images/{quote(image_id, safe='')}/fork",
                body,
            )
        )

    def deploy_image(
        self,
        image_id: str,
        *,
        idempotency_key: str | None = None,
        **input: Any,
    ) -> Sandbox:
        data = self._request(
            "POST",
            f"/v1/images/{quote(image_id, safe='')}/deploy",
            input,
            idempotency_key=idempotency_key,
        )
        return Sandbox(self, data)

    def subscription(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/subscription"))

    def list_hosts(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/data-plane/hosts")["items"])

    def control_plane_status(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/control-plane/status"))

    def platform_health(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/platform/health"))

    def catalog(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/catalog"))

    def templates(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/templates")["items"])

    def create_template(
        self,
        name: str,
        definition: str,
        *,
        description: str = "",
    ) -> dict[str, Any]:
        """Register a template from a FROM + RUN Dockerfile definition."""
        return dict(
            self._request(
                "POST",
                "/v1/templates",
                {"name": name, "definition": definition, "description": description},
            )
        )

    def get_template(self, id_or_name: str) -> dict[str, Any]:
        return dict(self._request("GET", f"/v1/templates/{quote(id_or_name, safe='')}"))

    def delete_template(self, id_or_name: str) -> None:
        self._request("DELETE", f"/v1/templates/{quote(id_or_name, safe='')}")

    def build_template(self, id_or_name: str) -> dict[str, Any]:
        """Start an asynchronous build that commits an immutable image."""
        return dict(
            self._request("POST", f"/v1/templates/{quote(id_or_name, safe='')}/builds", {})
        )

    def list_template_builds(self, id_or_name: str) -> list[dict[str, Any]]:
        return list(
            self._request("GET", f"/v1/templates/{quote(id_or_name, safe='')}/builds")["items"]
        )

    def get_template_build(self, build_id: str) -> dict[str, Any]:
        return dict(self._request("GET", f"/v1/template-builds/{quote(build_id, safe='')}"))

    def template_build_logs(self, build_id: str) -> dict[str, Any]:
        return dict(
            self._request("GET", f"/v1/template-builds/{quote(build_id, safe='')}/logs")
        )

    def deprecate_template(self, id_or_name: str) -> dict[str, Any]:
        """Block new sandboxes from the template; existing runtimes keep running."""
        return dict(
            self._request("POST", f"/v1/templates/{quote(id_or_name, safe='')}/deprecate", {})
        )

    def restore_template(self, id_or_name: str) -> dict[str, Any]:
        return dict(
            self._request("POST", f"/v1/templates/{quote(id_or_name, safe='')}/restore", {})
        )

    def agent_catalog(self) -> list[dict[str, Any]]:
        """Curated agent packages (marketplace) with live install state."""
        return list(self._request("GET", "/v1/agent-catalog")["items"])

    def sandbox_catalog(self) -> list[dict[str, Any]]:
        """Curated preloaded sandbox images with live install state."""
        return list(self._request("GET", "/v1/sandbox-catalog")["items"])

    def get_catalog_package(self, package_id: str) -> dict[str, Any]:
        return dict(self._request("GET", f"/v1/agent-catalog/{quote(package_id, safe='')}"))

    def install_catalog_package(self, package_id: str) -> dict[str, Any]:
        """Install a package: builds its template into an immutable image."""
        return dict(
            self._request("POST", f"/v1/agent-catalog/{quote(package_id, safe='')}/install", {})
        )

    def create_agent(self, **input: Any) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/agents", input))

    def list_agents(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/agents")["items"])

    def stop_agent(self, name: str) -> dict[str, Any]:
        return dict(self._request("POST", f"/v1/agents/{quote(name, safe='')}:stop", {}))

    def restart_agent(self, name: str) -> dict[str, Any]:
        return dict(self._request("POST", f"/v1/agents/{quote(name, safe='')}:restart", {}))

    def delete_agent(self, name: str) -> None:
        self._request("DELETE", f"/v1/agents/{quote(name, safe='')}")

    def agent_logs(self, name: str) -> list[str]:
        return list(self._request("GET", f"/v1/agents/{quote(name, safe='')}/logs"))

    def list_agent_secrets(self, name: str) -> dict[str, Any]:
        """Return secret names and application status. Values are never returned."""
        return dict(
            self._request(
                "GET", f"/v1/agents/{quote(name, safe='')}/secrets"
            )
        )

    def set_agent_secrets(
        self,
        name: str,
        secrets: dict[str, str],
        *,
        replace: bool = False,
    ) -> dict[str, Any]:
        """Create or rotate write-only environment secrets for one agent."""
        return dict(
            self._request(
                "PUT",
                f"/v1/agents/{quote(name, safe='')}/secrets",
                {"secrets": secrets, "replace": replace},
            )
        )

    def delete_agent_secret(self, name: str, key: str) -> dict[str, Any]:
        return dict(
            self._request(
                "DELETE",
                f"/v1/agents/{quote(name, safe='')}/secrets/{quote(key, safe='')}",
            )
        )

    def list_eval_suites(self, name: str) -> list[dict[str, Any]]:
        return list(
            self._request(
                "GET", f"/v1/agents/{quote(name, safe='')}/eval-suites"
            )["items"]
        )

    def create_eval_suite(
        self,
        name: str,
        suite: dict[str, Any],
    ) -> dict[str, Any]:
        """Create an Open AgentOps-compatible suite for a deployed agent."""
        return dict(
            self._request(
                "POST",
                f"/v1/agents/{quote(name, safe='')}/eval-suites",
                suite,
            )
        )

    def import_agentops_suite(
        self,
        name: str,
        scenario_path: str | os.PathLike[str],
        *,
        command: str,
        timeout_seconds: int = 60,
        min_score: float = 1.0,
        judge_provider: str = "auto",
        judge_model: str | None = None,
    ) -> dict[str, Any]:
        """
        Import a reviewable Open AgentOps scenario YAML.

        `open-agentops` and PyYAML are optional local dependencies. The YAML is
        converted to JSON before upload; model keys remain in the agent sandbox.
        """
        try:
            from open_agentops.config import load_yaml
        except ImportError as error:
            raise AgentPopError(
                "Open AgentOps is required for YAML import. Install "
                "https://github.com/reddywritescode/open-agentops."
            ) from error
        scenario = load_yaml(Path(scenario_path))
        payload = _agentops_suite_payload(
            scenario,
            command=command,
            timeout_seconds=timeout_seconds,
            min_score=min_score,
            judge_provider=judge_provider,
            judge_model=judge_model,
        )
        return self.create_eval_suite(name, payload)

    def generate_eval_suites_from_agentops(
        self,
        name: str,
        config_path: str | os.PathLike[str],
        *,
        command: str,
        agent_id: str | None = None,
        provider: str = "local",
        model: str | None = None,
        timeout_seconds: int = 60,
        min_score: float = 1.0,
        judge_provider: str = "auto",
        judge_model: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Generate rubrics/scenarios with the user's local Open AgentOps install,
        then register them with AgentPop. Provider API keys are read locally by
        Open AgentOps and are never included in the AgentPop API request.
        """
        try:
            from open_agentops.config import load_yaml
            from open_agentops.scenario_generator import generate_scenario_files
        except ImportError as error:
            raise AgentPopError(
                "Open AgentOps is required for rubric generation. Install "
                "https://github.com/reddywritescode/open-agentops."
            ) from error
        with tempfile.TemporaryDirectory(prefix="agentpop-agentops-") as output_dir:
            paths = generate_scenario_files(
                Path(config_path),
                agent_id=agent_id,
                provider=provider,
                model=model,
                output_dir=output_dir,
                force=True,
            )
            created = []
            for path in paths:
                payload = _agentops_suite_payload(
                    load_yaml(path),
                    command=command,
                    timeout_seconds=timeout_seconds,
                    min_score=min_score,
                    judge_provider=judge_provider,
                    judge_model=judge_model,
                )
                created.append(self.create_eval_suite(name, payload))
            return created

    def get_eval_suite(self, suite_id: str) -> dict[str, Any]:
        return dict(
            self._request(
                "GET", f"/v1/eval-suites/{quote(suite_id, safe='')}"
            )
        )

    def delete_eval_suite(self, suite_id: str) -> None:
        self._request("DELETE", f"/v1/eval-suites/{quote(suite_id, safe='')}")

    def list_eval_runs(
        self,
        *,
        name: str | None = None,
        suite_id: str | None = None,
    ) -> list[dict[str, Any]]:
        if suite_id:
            path = f"/v1/eval-suites/{quote(suite_id, safe='')}/runs"
        elif name:
            path = f"/v1/agents/{quote(name, safe='')}/eval-runs"
        else:
            raise ValueError("name or suite_id is required")
        return list(self._request("GET", path)["items"])

    def run_eval_suite(
        self,
        suite_id: str,
        *,
        environment: str = "sandbox",
        timeout: float = 600,
    ) -> dict[str, Any]:
        return dict(
            self._request(
                "POST",
                f"/v1/eval-suites/{quote(suite_id, safe='')}/runs",
                {"environment": environment},
                timeout=timeout,
            )
        )

    def get_eval_run(self, run_id: str) -> dict[str, Any]:
        return dict(
            self._request("GET", f"/v1/eval-runs/{quote(run_id, safe='')}")
        )

    def list_connectors(self, *, query: str = "") -> list[dict[str, Any]]:
        suffix = f"?q={quote(query, safe='')}" if query else ""
        return list(self._request("GET", f"/v1/connectors{suffix}")["items"])

    def list_connector_tools(
        self, connector_id: str, *, query: str = ""
    ) -> list[dict[str, Any]]:
        suffix = f"?q={quote(query, safe='')}" if query else ""
        response = self._request(
            "GET",
            f"/v1/connectors/{quote(connector_id, safe='')}/tools{suffix}",
        )
        return list(response["items"])

    def authorize_connector(self, connector_id: str) -> dict[str, Any]:
        """Create a real provider OAuth Connect Link."""
        return dict(
            self._request(
                "POST",
                f"/v1/connectors/{quote(connector_id, safe='')}/authorize",
                {},
            )
        )

    def connect_connector(
        self, connector_id: str, *, account: str | None = None, actions: list[str] | None = None
    ) -> dict[str, Any]:
        """Deprecated alias for authorize_connector."""
        del account, actions
        return self.authorize_connector(connector_id)

    def update_connector(
        self, connector_id: str, *, account: str | None = None, actions: list[str] | None = None
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if account is not None:
            body["account"] = account
        if actions is not None:
            body["actions"] = actions
        return dict(self._request("PATCH", f"/v1/connectors/{quote(connector_id, safe='')}/connections", body))

    def disconnect_connector(self, connector_id: str) -> None:
        self._request("DELETE", f"/v1/connectors/{quote(connector_id, safe='')}/connections")

    def invoke_connector(
        self,
        connector_id: str,
        tool: str,
        *,
        arguments: dict[str, Any] | None = None,
        thought: str | None = None,
        agent: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"arguments": arguments or {}}
        if thought is not None:
            body["thought"] = thought
        if agent is not None:
            body["agent"] = agent
        return dict(
            self._request(
                "POST",
                f"/v1/connectors/{quote(connector_id, safe='')}/tools/{quote(tool, safe='')}",
                body,
            )
        )

    def list_networks(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/networks")["items"])

    def create_network(self, *, name: str, cidr: str = "", region: str = "local") -> dict[str, Any]:
        return dict(self._request("POST", "/v1/networks", {"name": name, "cidr": cidr, "region": region}))

    def attach_network_sandbox(self, network_id: str, sandbox_id: str) -> dict[str, Any]:
        return dict(self._request("POST", f"/v1/networks/{quote(network_id, safe='')}/members", {"sandboxId": sandbox_id}))

    def detach_network_sandbox(self, network_id: str, sandbox_id: str) -> dict[str, Any]:
        return dict(self._request("DELETE", f"/v1/networks/{quote(network_id, safe='')}/members/{quote(sandbox_id, safe='')}"))

    def delete_network(self, network_id: str) -> None:
        self._request("DELETE", f"/v1/networks/{quote(network_id, safe='')}")

    def list_storages(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/storages")["items"])

    def create_storage(self, **input: Any) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/storages", input))

    def attach_storage(self, storage_id: str, sandbox_id: str) -> dict[str, Any]:
        return dict(self._request("POST", f"/v1/storages/{quote(storage_id, safe='')}/attachments", {"sandboxId": sandbox_id}))

    def detach_storage(self, storage_id: str, sandbox_id: str) -> dict[str, Any]:
        return dict(self._request("DELETE", f"/v1/storages/{quote(storage_id, safe='')}/attachments/{quote(sandbox_id, safe='')}"))

    def delete_storage(self, storage_id: str) -> None:
        self._request("DELETE", f"/v1/storages/{quote(storage_id, safe='')}")

    def list_webhooks(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/webhooks")["items"])

    def create_webhook(self, *, url: str, events: list[str]) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/webhooks", {"url": url, "events": events}))

    def test_webhook(self, webhook_id: str) -> dict[str, Any]:
        return dict(self._request("POST", f"/v1/webhooks/{quote(webhook_id, safe='')}/test", {}))

    def delete_webhook(self, webhook_id: str) -> None:
        self._request("DELETE", f"/v1/webhooks/{quote(webhook_id, safe='')}")

    def list_members(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/members"))

    def invite_member(self, *, email: str, role: str) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/members", {"email": email, "role": role}))

    def update_member(self, *, email: str, role: str) -> dict[str, Any]:
        return dict(self._request("PATCH", f"/v1/members/{quote(email, safe='')}", {"role": role}))

    def remove_member(self, email: str) -> None:
        self._request("DELETE", f"/v1/members/{quote(email, safe='')}")

    def list_api_keys(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/api-keys"))

    def create_api_key(self, *, name: str, scopes: list[str]) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/api-keys", {"name": name, "scopes": scopes}))

    def revoke_api_key(self, key_id_or_name: str) -> None:
        self._request("DELETE", f"/v1/api-keys/{quote(key_id_or_name, safe='')}")

    def get_project(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/project"))

    def update_project(self, **patch: Any) -> dict[str, Any]:
        return dict(self._request("PATCH", "/v1/project", patch))

    def request_quota_increase(self, message: str = "Increase project quotas.") -> dict[str, Any]:
        return dict(self._request("POST", "/v1/quota-requests", {"message": message}))

    def audit_events(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/audit-events")["items"])

    def usage(self) -> dict[str, Any]:
        return dict(self._request("GET", "/v1/usage"))

    def quotas(self) -> list[dict[str, Any]]:
        return list(self._request("GET", "/v1/quotas"))

    def add_local_credits(self, amount: float) -> dict[str, Any]:
        return dict(self._request("POST", "/v1/billing/credits", {"amount": amount}))

    def delete_project(self) -> None:
        self._request("DELETE", "/v1/project")


def _agentops_suite_payload(
    scenario: dict[str, Any],
    *,
    command: str,
    timeout_seconds: int,
    min_score: float,
    judge_provider: str,
    judge_model: str | None,
) -> dict[str, Any]:
    tests = scenario.get("tests")
    if tests is None:
        tests = scenario.get("cases")
    payload: dict[str, Any] = {
        "version": int(scenario.get("version") or 1),
        "scenario": str(
            scenario.get("scenario")
            or scenario.get("suite")
            or scenario.get("name")
            or "agent_eval"
        ),
        "description": str(scenario.get("description") or ""),
        "runner": {
            "type": "command",
            "command": command,
            "timeoutSeconds": timeout_seconds,
            "judgeProvider": judge_provider,
        },
        "gate": {"minScore": min_score},
        "tests": list(tests or []),
        "source": "open-agentops",
        "generated": bool(scenario.get("generated", False)),
        "review_required": bool(scenario.get("review_required", False)),
    }
    if judge_model:
        payload["runner"]["judgeModel"] = judge_model
    if isinstance(scenario.get("generation"), dict):
        payload["generation"] = scenario["generation"]
    if isinstance(scenario.get("check_profile"), dict):
        payload["check_profile"] = scenario["check_profile"]
    return payload
