---
sidebar_position: 8
title: Examples
description: Real projects built with SpecWeave, what each one shows, and whether its source is public.
keywords: [examples, use cases, multi-repo, mobile, Cloudflare Workers]
---

# Examples

These are real projects built with SpecWeave. Most were built before 3.0, so their increments use the older layout with a separate `tasks.md`; the 3.0 CLI still reads them. Where a repository is private, that is said next to it.

## SpecWeave, built with SpecWeave

SpecWeave itself is developed as a series of increments: features, fixes, docs pages and releases. The 3.0 changes came out of an audit of 2.3.0 that measured a real project end to end (see [SpecWeave 3.0](/docs/guides/specweave-3#why)). Source: [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave).

What it shows: increments over a long-running, multi-repository project, which is where the 3.0 single-file spec, the ledger and handoff came from.

## WC26 travel companion

A travel companion for the 2026 FIFA World Cup: match schedules, venues, tickets and trip planning, as a web app, an API, a scraper and a mobile app. Live at [wc-26.net](https://wc-26.net). Source is private.

```
wc26-web/        React 19, TailwindCSS, TanStack Query, Leaflet on Cloudflare Pages
wc26-api/        Hono on Cloudflare Workers
wc26-scraper/    Cloudflare Workers with Workers AI
wc26-mobile/     Expo / React Native
wc26-supabase/   Supabase schema and migrations
```

What it shows: many increments over one product, each touching one or more of five repositories, and a mobile app added later as its own increment in a new repository.

## Public example repositories

Small projects with public source, each showing one setup. More repositories with the `sw-` prefix are under [github.com/anton-abyzov](https://github.com/anton-abyzov?tab=repositories&q=sw-).

| Project | Repositories | What it shows |
|---|---|---|
| Mini Doom | `sw-mini-doom` | A single-repo browser game in TypeScript with Three.js |
| Finance snapshot | `sw-finance-snapshot-api`, `sw-finance-snapshot-scheduler`, `sw-finance-snapshot-mock` | An API, a scheduled job and a mock service as separate repositories |

## Try it on your own project

The quickest way to see SpecWeave work is on a change you were going to make anyway:

```bash
npm install -g specweave@3
cd your-project
specweave init
specweave create-increment "Add dark mode toggle"
```

Fill in `spec.md` (or ask your AI tool to), then work the tasks:

```bash
specweave task next
specweave task done T-01 --run "npm test"
specweave verify
specweave complete 0001
```

Or skip the commands and ask in plain words: "plan a dark mode toggle as an increment", then "do the next task". See [Your first increment](/docs/getting-started/first-increment).

## See also

- [Brownfield projects](/docs/workflows/brownfield)
- [Autonomous execution](/docs/guides/autonomous-execution)
- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
