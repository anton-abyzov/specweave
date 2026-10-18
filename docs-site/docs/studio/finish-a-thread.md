---
title: "Finish a SpecWithCode thread: leave the branch, open a pull request or auto-merge"
sidebar_label: Finish a thread
description: "What happens to a thread's worktree branch when its work is done: Leave branch, Open PR or Open PR and auto-merge, how merging waits for checks and branch protection, resolving conflicts in the owning thread, and reviewing on the Pull requests page."
---

# Finish a thread

Every worker thread runs in its own worktree on its own branch. When the thread finishes its work with nothing queued, SpecWithCode does one of three things with that branch, set per project.

## Choose what happens

**Settings > Source Control > When a thread finishes** sets it for every project; the same row in a project's settings overrides it for that project.

| Choice | What happens |
|---|---|
| Leave branch | Nothing. The branch stays for you to look at, push or delete. |
| Open PR | A pull request into the repository's default branch, linked to the thread. |
| Open PR and auto-merge | The same pull request, then merged through the host. New projects start on this choice. |

The default branch is read from the host, then from git. Each outcome appears as a notice on the thread.

## How merging stays safe

A merge always goes through the host, never around it:

- When the pull request is ready now (checks done, mergeable), it merges.
- Otherwise the host's own auto-merge waits for the required checks and branch protection.
- It does not merge a closed pull request, failing checks or a branch that conflicts with its base; the thread shows why.
- Nothing is ever force-pushed.

GitHub, GitLab and Azure DevOps support auto-merge while checks are still running. SpecWithCode also works with Forgejo, Gitea and Bitbucket for cloning, publishing and pull requests.

## When the pull request conflicts

A conflict is resolved in the thread that wrote the code, because that thread knows why the code looks the way it does. When a thread's own pull request conflicts with its base branch, its card and its pull request row offer **Resolve conflicts**. That sends the owning thread the pull request, its base branch and an instruction to stop and ask you if a conflict needs a product decision it cannot make from the code. This arrived in SpecWithCode 1.0.43 (18 October 2026).

## Review before or after

Open **Pull requests** to read the changes and comments, request reviewers, check out a branch or merge. Tick a file in the **Code** tab once you have read it and it collapses; on GitHub these are GitHub's own viewed marks, so a review carries over to github.com.

A thread can hold several pull requests; creating one from the thread's Git actions links it automatically. Ask an agent to "watch this PR" and it checks every two minutes while the thread is active, waking when a check fails, the required checks pass, someone else comments or reviews, or the branch starts to conflict.

## Before you connect a host

Install Git and sign in on the machine that runs the thread. For GitHub, a token in **Settings > Source Control > GitHub**, `GH_TOKEN`, or the GitHub CLI 2.81.0 or newer signed in with `gh auth login` all work. Other hosts use their own CLI or token; see [Source control](https://github.com/anton-abyzov/specwithcode/blob/main/docs/user/source-control.md) in the SpecWithCode repository.

If you use SpecWeave, the thread's increment, ledger and evidence travel in the same branch, so the pull request carries the spec and the proof with the code. See [the daily loop](/docs/workflows/overview).
