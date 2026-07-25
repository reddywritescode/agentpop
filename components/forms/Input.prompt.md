Single-line text field; `mono` whenever the value is machine-readable (IDs, endpoints, env keys).

```jsx
<Input placeholder="my-sandbox" />
<Input leading={<Icon name="search" />} placeholder="Search sandboxes" />
<Input mono placeholder="https://s3.amazonaws.com" />
<Input invalid value="Bad Name!" />
```

Helper text goes below the field: 13px `--text-secondary`, one short sentence ("Lowercase letters, digits, hyphens. Max 22 chars.").
