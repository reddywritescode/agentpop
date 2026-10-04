#!/usr/bin/env bash
set -euo pipefail

project_id="${AGENTPOP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
region="${AGENTPOP_REGION:-us-west1}"
zone="${AGENTPOP_ZONE:-us-west1-b}"
repository="${AGENTPOP_ARTIFACT_REPOSITORY:-agentpop}"
image_tag="${AGENTPOP_IMAGE_TAG:-}"
instance="${AGENTPOP_MANAGEMENT_INSTANCE:-agentpop-management}"
address_name="${AGENTPOP_ADDRESS_NAME:-agentpop-management-ip}"
machine_type="${AGENTPOP_MANAGEMENT_MACHINE_TYPE:-e2-medium}"
state_disk="${AGENTPOP_MANAGEMENT_STATE_DISK:-${instance}-state}"
state_disk_size="${AGENTPOP_MANAGEMENT_STATE_DISK_SIZE:-50GB}"
state_device_name="${AGENTPOP_MANAGEMENT_STATE_DEVICE_NAME:-agentpop-state}"
hosted_env="${AGENTPOP_HOSTED_ENV:-}"
data_plane_instance="${AGENTPOP_DATA_PLANE_INSTANCE:-agentplane-firecracker-dev}"
service_account_name="${AGENTPOP_MANAGEMENT_SERVICE_ACCOUNT:-agentpop-management}"

if [[ -z "${project_id}" || "${project_id}" == "(unset)" ]]; then
  echo "Set AGENTPOP_PROJECT_ID or configure a gcloud project." >&2
  exit 1
fi
if [[ -z "${image_tag}" ]]; then
  echo "Set AGENTPOP_IMAGE_TAG to a tag already built by build-images.sh." >&2
  exit 1
fi
if [[ -z "${hosted_env}" || ! -f "${hosted_env}" ]]; then
  echo "Set AGENTPOP_HOSTED_ENV to an existing hosted .env file." >&2
  exit 1
fi

required=(
  ACME_EMAIL ALPHA_USER ALPHA_PASSWORD_HASH
  CONTROL_PLANE_API_KEY CONTROL_PLANE_ENCRYPTION_KEY
  ADMIN_EMAIL ADMIN_PASSWORD_SHA256 ADMIN_SESSION_SECRET
  CUSTOMER_SESSION_SECRET CUSTOMER_ALLOWED_GITHUB_LOGINS
  GITHUB_OAUTH_CLIENT_ID GITHUB_OAUTH_CLIENT_SECRET
  IMAGE_GENERATOR_API_URL IMAGE_GENERATOR_API_KEY IMAGE_GENERATOR_MODEL
  HOST_AGENT_TOKEN
)
for key in "${required[@]}"; do
  if ! grep -Eq "^${key}=.+" "${hosted_env}"; then
    echo "${hosted_env} is missing ${key}." >&2
    exit 1
  fi
done

registry="${region}-docker.pkg.dev/${project_id}/${repository}"
service_account="${service_account_name}@${project_id}.iam.gserviceaccount.com"
temporary_env="$(mktemp /tmp/agentpop-hosted.XXXXXX)"
trap 'rm -f "${temporary_env}"' EXIT
cp "${hosted_env}" "${temporary_env}"
printf '\nAGENTPOP_WEB_IMAGE=%s/web:%s\n' "${registry}" "${image_tag}" >>"${temporary_env}"
printf 'AGENTPOP_CONTROL_PLANE_IMAGE=%s/control-plane:%s\n' "${registry}" "${image_tag}" >>"${temporary_env}"
printf 'AGENTPOP_CONNECTOR_BROKER_IMAGE=%s/connector-broker:%s\n' "${registry}" "${image_tag}" >>"${temporary_env}"

data_plane_ip="$(
  gcloud compute instances describe "${data_plane_instance}" \
    --project="${project_id}" \
    --zone="${zone}" \
    --format='value(networkInterfaces[0].networkIP)'
)"
printf 'HOST_AGENT_URL=http://%s:9090\n' "${data_plane_ip}" >>"${temporary_env}"

if ! gcloud compute addresses describe "${address_name}" \
  --project="${project_id}" \
  --region="${region}" >/dev/null 2>&1; then
  gcloud compute addresses create "${address_name}" \
    --project="${project_id}" \
    --region="${region}"
fi
static_ip="$(
  gcloud compute addresses describe "${address_name}" \
    --project="${project_id}" \
    --region="${region}" \
    --format='value(address)'
)"

gcloud compute firewall-rules describe agentpop-management-web \
  --project="${project_id}" >/dev/null 2>&1 \
  || gcloud compute firewall-rules create agentpop-management-web \
    --project="${project_id}" \
    --network=default \
    --direction=INGRESS \
    --allow=tcp:80,tcp:443,udp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=agentpop-management

gcloud compute firewall-rules describe agentpop-control-to-data \
  --project="${project_id}" >/dev/null 2>&1 \
  || gcloud compute firewall-rules create agentpop-control-to-data \
    --project="${project_id}" \
    --network=default \
    --direction=INGRESS \
    --allow=tcp:9090 \
    --source-tags=agentpop-management \
    --target-tags=agentpop-data-plane

gcloud compute instances add-tags "${data_plane_instance}" \
  --project="${project_id}" \
  --zone="${zone}" \
  --tags=agentpop-data-plane

if ! gcloud iam service-accounts describe "${service_account}" \
  --project="${project_id}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${service_account_name}" \
    --project="${project_id}" \
    --display-name="AgentPop management VM"
fi
gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${service_account}" \
  --role=roles/artifactregistry.reader \
  --condition=None >/dev/null

if ! gcloud compute disks describe "${state_disk}" \
  --project="${project_id}" \
  --zone="${zone}" >/dev/null 2>&1; then
  gcloud compute disks create "${state_disk}" \
    --project="${project_id}" \
    --zone="${zone}" \
    --size="${state_disk_size}" \
    --type=pd-balanced
fi

if ! gcloud compute instances describe "${instance}" \
  --project="${project_id}" \
  --zone="${zone}" >/dev/null 2>&1; then
  gcloud compute instances create "${instance}" \
    --project="${project_id}" \
    --zone="${zone}" \
    --machine-type="${machine_type}" \
    --network=default \
    --address="${static_ip}" \
    --tags=agentpop-management \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-balanced \
    --disk="name=${state_disk},device-name=${state_device_name},mode=rw,boot=no,auto-delete=no" \
    --service-account="${service_account}" \
    --scopes=cloud-platform \
    --metadata=enable-oslogin=TRUE \
    --metadata-from-file=startup-script=deploy/gcp/management-startup.sh,agentpop-state-mount-script=deploy/gcp/mount-management-state.sh
else
  attached_state_device="$(
    gcloud compute instances describe "${instance}" \
      --project="${project_id}" \
      --zone="${zone}" \
      --format="value(disks[deviceName=${state_device_name}].deviceName)"
  )"
  if [[ "${attached_state_device}" != "${state_device_name}" ]]; then
    gcloud compute instances attach-disk "${instance}" \
      --project="${project_id}" \
      --zone="${zone}" \
      --disk="${state_disk}" \
      --device-name="${state_device_name}" \
      --mode=rw
  fi
  gcloud compute instances add-metadata "${instance}" \
    --project="${project_id}" \
    --zone="${zone}" \
    --metadata=enable-oslogin=TRUE \
    --metadata-from-file=startup-script=deploy/gcp/management-startup.sh,agentpop-state-mount-script=deploy/gcp/mount-management-state.sh
fi

for _ in {1..30}; do
  if gcloud compute ssh "${instance}" \
    --project="${project_id}" \
    --zone="${zone}" \
    --command='test -x /usr/bin/docker && test -d /opt/agentpop' >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

gcloud compute scp \
  deploy/hosted/compose.hosted.yaml \
  deploy/hosted/Caddyfile \
  deploy/gcp/mount-management-state.sh \
  "${temporary_env}" \
  "${instance}:/tmp/" \
  --project="${project_id}" \
  --zone="${zone}"

gcloud compute ssh "${instance}" \
  --project="${project_id}" \
  --zone="${zone}" \
  --command="sudo install -m 0755 /tmp/mount-management-state.sh /usr/local/sbin/agentpop-mount-management-state && sudo AGENTPOP_STATE_DEVICE_NAME=${state_device_name} /usr/local/sbin/agentpop-mount-management-state && sudo install -m 0644 /tmp/compose.hosted.yaml /opt/agentpop/compose.yaml && sudo install -m 0644 /tmp/Caddyfile /opt/agentpop/Caddyfile && sudo install -m 0600 /tmp/$(basename "${temporary_env}") /opt/agentpop/.env && access_token=\$(curl -fsS -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token | jq -r .access_token) && printf '%s' \"\${access_token}\" | sudo docker login -u oauth2accesstoken --password-stdin ${region}-docker.pkg.dev && cd /opt/agentpop && sudo docker compose pull && sudo docker compose up -d"

printf '\nManagement IP: %s\n' "${static_ip}"
printf 'DNS: @, app, admin, api, preview -> %s; www -> agentpop.cloud\n' "${static_ip}"
printf 'Management state disk: %s (%s, auto-delete disabled)\n' "${state_disk}" "${state_disk_size}"
printf 'Data plane %s remains in its current power state.\n' "${data_plane_instance}"
