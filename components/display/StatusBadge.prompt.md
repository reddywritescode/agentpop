Lifecycle status pill (icon + text + tone, never color alone) for sandboxes, agents, health.

```jsx
<StatusBadge status="running" />
<StatusBadge status="provisioning" />   // spinning loader
<StatusBadge status="failed" size="sm" />
```

Sandbox states: queued, provisioning, running, pausing, paused, resuming, deleting, deleted, failed. Agent: deploying, stopped. Generic: active, inactive, healthy, degraded, error. `label` overrides text.
