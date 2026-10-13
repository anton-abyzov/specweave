# Diagnostic handoff fixture: Ledger-aware unfinished task selection

This deliberately incomplete fixture tests product handoff continuity. It is
not a production bug fix and is not imported by the application. Source M4
must keep its tests red; each destination worker completes only `case.mjs`.

Decision: `APPEND_ORDER_LATEST_RECOGNIZED_EVENT`.

`unfinishedTaskIds(taskIds, events)` returns unfinished task IDs in the
supplied task-ID order. Events have the ledger shape `{ t, e, at? }`. The latest
recognized event for a known task in array append order wins: `done` and `skip`
settle it; `claim`, `release`, and `block` make it unfinished. A task with no
recognized event is unfinished. Ignore unknown event types and unknown task
IDs. Timestamps are metadata, never a sorting key. Preserve task IDs, input
arrays, and event objects, and always return a fresh result array.

Run from the nested repository with the verified host-local Node 22 executable:

```sh
"$SW_DIAGNOSTIC_NODE" --test --test-reporter=tap scripts/diagnostics/handoff/0907-product-specweave/case.check.mjs
```

Node locations: M4 `~/.nvm/versions/node/v22.20.0/bin/node`; M1 and M3
`~/.local/share/specweave/node22/bin/node`. Check `--version` starts with `v22.`.
No dependencies, `.env`, credentials, production imports, installs, providers,
services, or network requests are needed. Keep `case.check.mjs` and this README
unchanged. Passing this fixture proves bounded code/context continuation only,
not full application readiness or any production feature.
