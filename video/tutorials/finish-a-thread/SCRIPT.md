# Finish a thread with a pull request and auto-merge

SpecWithCode 1.0.48, Codex, public demo repo anton-abyzov/greet-app-demo. 79.3 s. Recorded 2026-10-18.

| Beat | Chapter | VO |
|---|---|---|
| 01 | What you will see | Finish a thread with a pull request and auto-merge. |
| 02 | The thread finishes and opens a PR | Coordinator started "Greet a team" in its own worktree; Codex does T-01 of 0002, commits, stops clean; finish rule opens #2 into main and turns on auto-merge; main changed the same lines, so the thread reports a conflict and does not merge. |
| 03 | Open PR and auto-merge, per project | Project setting When a thread finishes = Open PR and auto-merge; squash on merge; agent credit lines removed. |
| 04 | Code Review | #2 blocked by the conflict, auto-merge armed; no review required; Code tab shows the change. |
| 05 | Resolve the conflict in its thread | Send the conflict back to the thread; Codex merges main, keeps Hi wording, runs npm test, pushes. |
| 06 | Merged | Auto-merge still on; required test check passes; GitHub merges; Merged #2 into main. |
| 07 | Next: sw-done | Next, sw-done verifies and closes the increment. |

Full VO text: scripts/vo-lines.json. Shots: SHOTLIST.json (take A: 02-03) and SHOTLIST-B.json (take B: 04-06). Edit: edit.json.

## Product findings (1.0.48)
1. A coordinator launch with baseRef HEAD writes `branch.<b>.gh-merge-base=HEAD`; finish then fails with "Could not open a pull request: Validation Failed; base invalid". Seen in rehearsal; the take asked for "a new worktree from main" and gh-merge-base read main.
2. Coordinator-started threads rendered no AnnouncedThreadCard, so the card's Resolve conflicts was not available.
3. The Code Review Resolve conflicts button drafts a coordinator prompt to delegate to a project worker, not to the owning thread (the guide says it sends the owning thread). The take types the request into the thread instead.
4. Codex ran `specweave handoff` unasked in the first rehearsal and pushed three branches to the public repo (deleted). Demo AGENTS.md now forbids it.
5. Branch prefix is machine-scope only (Source Control); no project override.
6. Recorder note: the Code tab is not role=tab; locate it by text.
7. The demo PATH had no npm; Codex found the owner's Homebrew npm itself (visible briefly, sped up).
