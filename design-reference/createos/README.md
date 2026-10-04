# CreateOS UI reference archive

These screenshots are research references for a functionally similar but independently branded sandbox and agent platform. They are not a license to reuse CreateOS trademarks, logos, or copyrighted marketing copy.

Use `CLAUDE-DESIGN-PROMPT.md` with all images attached. Screenshot 14 is explicitly out of product scope; screenshots 16 and 18 are partial references only.

| # | File | Reference purpose | Dimensions |
|---:|---|---|---:|
| 1 | `01-create-sandbox-form-top.png` | Sandbox creation, resources, image, disk, preview, idle | 1250×1666 |
| 2 | `02-create-sandbox-form-egress-env.png` | Egress and environment variables | 1314×922 |
| 3 | `03-sandbox-list-public-url.png` | Sandbox row, actions, public port URL | 3014×552 |
| 4 | `04-create-template-modal.png` | Dockerfile template creation | 1738×1374 |
| 5 | `05-networks-list.png` | Network row and actions | 3052×516 |
| 6 | `06-attach-sandbox-to-network-modal.png` | Network membership | 3016×1364 |
| 7 | `07-register-s3-storage-modal.png` | S3-compatible storage registration | 3456×1956 |
| 8 | `08-create-webhook-modal.png` | Webhook URL and event selection | 3456×1926 |
| 9 | `09-audit-logs.png` | Audit list | 3452×1956 |
| 10 | `10-create-api-key-modal.png` | API key form | 3456×1972 |
| 11 | `11-api-keys-empty-state.png` | API key settings empty state | 3056×1536 |
| 12 | `12-for-agents-cli-overview-top.png` | CLI/developer quickstart | 3032×1914 |
| 13 | `13-for-agents-cli-overview-bottom.png` | CLI capabilities and install | 2990×1890 |
| 14 | `14-services-catalog-out-of-scope.png` | Out of scope: managed services | 3456×1936 |
| 15 | `15-connectors-catalog.png` | Connector catalog | 3454×1938 |
| 16 | `16-deploy-existing-project.png` | Partial reference: agent deployment entry | 3456×1938 |
| 17 | `17-agents-empty-state.png` | Agent list empty state | 3456×1958 |
| 18 | `18-deploy-existing-project-variant.png` | Partial duplicate of deployment entry | 3456×1946 |
| 19 | `19-deploy-agent-form.png` | Agent configuration form | 3456×1832 |
| 20 | `20-agents-deploying-list.png` | Agent deployment state | 3450×1936 |

All 20 files were archived from the user-provided temporary sources and verified as readable PNG files on July 21, 2026.

## Current product audit — July 25, 2026

The user supplied a second, current snapshot set after CreateOS expanded its
project, skills, applications, and billing surfaces. Those 18 images are saved
under [`screenshots/current-2026-07-25`](screenshots/current-2026-07-25).

| # | File | Decision informed |
|---:|---|---|
| 1 | `01-create-project.png` | Do not add a generic app builder; use prompt-to-recipe |
| 2 | `02-docker-deploy.png` | Keep Dockerfile/image configuration as recipe internals |
| 3 | `03-create-project-upload.png` | File upload is not part of the focused MVP |
| 4 | `04-projects.png` | Do not add project folders before multi-project demand |
| 5 | `05-deploy-existing.png` | Replace separate deploy entry points with one marketplace |
| 6 | `06-deploy-openclaw.png` | Agent configuration becomes an agent-type sandbox recipe |
| 7 | `07-agent-terminal.png` | Keep terminal, resources, docs, and SSH on sandbox detail |
| 8 | `08-skills-marketplace.png` | Recipes, not a second skills product |
| 9 | `09-my-skills.png` | Generated/custom recipes appear in the same marketplace |
| 10 | `10-connectors.png` | Keep connector broker and explicit grants |
| 11 | `11-create-sandbox.png` | Keep resource, egress, preview, idle, env, and secret inputs |
| 12 | `12-networks.png` | Move topology out of customer navigation |
| 13 | `13-add-to-network.png` | Preserve private API/operator capability only |
| 14 | `14-create-template.png` | Dockerfile review/build is the recipe installation mechanism |
| 15 | `15-api-keys.png` | Keep developer API-key management |
| 16 | `16-applications-marketplace.png` | Applications are explicitly out of product scope |
| 17 | `17-billing-usage.png` | Replace credits/usage with fixed $20/month |
| 18 | `18-edit-agent.png` | Edit agent recipe metadata and write-only secrets |

The live CreateOS “For Agents” page was also audited on July 25. Its core value
is a machine-facing façade—CLI commands for deploy, manage, monitor, scale,
scaffold, and automation—over the same infrastructure. AgentPop adapts that
idea through one REST/OpenAPI contract, MCP, CLI, and TypeScript/Python/Go SDKs
without reproducing CreateOS branding or copyrighted copy.
