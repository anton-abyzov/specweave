# First task with Antigravity + Gemini

Current setup walkthrough captured from SpecWithCode 1.0.105 on October 28, 2026. The task remains an unsubmitted draft; instructional diagrams do not claim a completed provider run.

## 1. Start small

Run one small change with Antigravity and Gemini in Spec With Code. This walkthrough prepares the task; it does not submit a provider run.

## 2. Connect the agent

In Settings, Providers, enable Antigravity on the project’s machine, install its runtime and complete its separate sign-in. Wait for account access and the model list. Choose a Gemini model that account actually offers.

## 3. Open the project

Open an example repository as a project. The main conversation is the project coordinator. Check which machine is doing the work.

## 4. Choose deliberately

Select Antigravity, then an available Gemini model and the approval mode you intend to use. This tutorial does not require full access.

## 5. Write one bounded task

Give it one bounded task: add a named greeting, keep the no argument greeting working, and add tests for both. Ask it to describe the change before editing. Antigravity has its own native plan command; do not assume the app’s separate Plan mode is available.

## 6. Review before execution

Read the proposed change, then ask it to implement. Review any command approval rather than accepting it automatically.

## 7. Read the evidence

Inspect the changed files and the actual test output. If a check failed or was not run, keep that in the result. A confident reply is not test evidence.

## 8. Keep the result reviewable

Finish with the change, its diff, and actual test evidence. Use Spec Weave increments when you need a durable plan and task record. They are optional for this first task.
