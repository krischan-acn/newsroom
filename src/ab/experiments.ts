// Experiment registry — edit this file to add/remove A/B tests. Not
// server-only: the `id`/`name` fields are sent to the client, but `match`
// only ever runs on the server (inside the /api/ab/experiments route).
//
// How to add an experiment:
//   1. Pick a short id, e.g. "article-sidebar".
//   2. Write the "B" variant as plain CSS in public/ab-variants/<id>.css.
//      Scope every rule to [data-ab-target="<id>"] so it only ever touches
//      the elements you've opted in, e.g.:
//        [data-ab-target="article-sidebar"] { flex-direction: row-reverse; }
//   3. Add a data-ab-target="<id>" attribute to the container(s) you're
//      testing in the actual page/component.
//   4. Add an entry below. It starts OFF — flip it on from /admin.
//
// The "A" version is always just the site as it already renders — no file
// needed for it.

export type Experiment = {
  id: string;
  name: string;
  /** Human-readable, shown in /admin. Not used for matching. */
  routeLabel: string;
  /** Runs server-side only; decides whether this experiment applies to a path. */
  match: (pathname: string) => boolean;
};

export const EXPERIMENTS: Experiment[] = [
  // Example (commented out) — copy this shape for a real experiment:
  // {
  //   id: 'article-sidebar',
  //   name: 'Article sidebar layout',
  //   routeLabel: '/article/*',
  //   match: (pathname) => pathname.startsWith('/article/'),
  // },
];

export function findExperimentForPath(pathname: string): Experiment | null {
  return EXPERIMENTS.find((exp) => exp.match(pathname)) ?? null;
}

export function getExperiment(id: string): Experiment | null {
  return EXPERIMENTS.find((exp) => exp.id === id) ?? null;
}
