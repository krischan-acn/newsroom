# A/B variant stylesheets

One plain CSS file per experiment, named `<experiment-id>.css`. No build
step — edit and refresh.

**Scope every rule to the elements you're testing**, using a
`data-ab-target="<experiment-id>"` attribute you add to that element in the
page/component. This keeps a variant impossible to leak onto unrelated
elements, and it's also what the pulse animation looks for when a viewer
switches modes.

```css
/* public/ab-variants/article-sidebar.css */
[data-ab-target="article-sidebar"] {
  flex-direction: row-reverse;
}
```

```tsx
// wherever that container lives
<aside data-ab-target="article-sidebar" className={RAIL_WIDTH}>
```

Then register the experiment in `src/ab/experiments.ts` (id, name, and
which routes it applies to) and flip it on from `/admin`.

The "A" version is never a file here — it's just the site as it already
renders.
