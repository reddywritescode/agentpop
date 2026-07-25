Action button for all clickable actions; one primary per view, sentence-case labels.

```jsx
<Button leadingIcon={<Icon name="plus" />}>New sandbox</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger" leadingIcon={<Icon name="trash-2" />}>Destroy</Button>
<Button loading>Creating…</Button>
<Button variant="ghost" size="icon"><Icon name="terminal" /></Button>
```

Variants: primary (accent, one per view), secondary (bordered white), outline, ghost (toolbars/row actions), danger, danger-outline, link. Sizes sm/md/lg + icon-sm/icon/icon-lg (square). `loading` swaps the leading icon for a spinner and disables.
