#!/usr/bin/env bash
set -euo pipefail

project_id="${AGENTPOP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
region="${AGENTPOP_REGION:-us-west1}"
repository="${AGENTPOP_ARTIFACT_REPOSITORY:-agentpop}"
image_tag="${AGENTPOP_IMAGE_TAG:-$(date -u +%Y%m%d%H%M%S)}"

if [[ -z "${project_id}" || "${project_id}" == "(unset)" ]]; then
  echo "Set AGENTPOP_PROJECT_ID or configure a gcloud project." >&2
  exit 1
fi

if ! gcloud artifacts repositories describe "${repository}" \
  --project="${project_id}" \
  --location="${region}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${repository}" \
    --project="${project_id}" \
    --location="${region}" \
    --repository-format=docker \
    --description="AgentPop hosted images"
fi

gcloud builds submit . \
  --project="${project_id}" \
  --config=deploy/gcp/cloudbuild.yaml \
  --substitutions="_REGION=${region},_REPOSITORY=${repository},_TAG=${image_tag}"

registry="${region}-docker.pkg.dev/${project_id}/${repository}"
printf 'AGENTPOP_WEB_IMAGE=%s/web:%s\n' "${registry}" "${image_tag}"
printf 'AGENTPOP_CONTROL_PLANE_IMAGE=%s/control-plane:%s\n' "${registry}" "${image_tag}"
printf 'AGENTPOP_CONNECTOR_BROKER_IMAGE=%s/connector-broker:%s\n' "${registry}" "${image_tag}"
