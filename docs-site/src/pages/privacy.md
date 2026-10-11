---
title: Privacy Policy
description: How SpecWeave, SpecWeave Studio and spec-weave.com handle your information, including data read from your Google account.
---

# Privacy Policy

Effective 11 October 2026.

This policy covers the SpecWeave command-line tool, the SpecWeave Studio desktop app and service, and this website, spec-weave.com. They are made by Anton Abyzov ("we"). Questions go to [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com).

## Where your data lives

SpecWeave and SpecWeave Studio run on machines you own. Your projects, specs, prompts, agent conversations, settings and sign-ins stay on those machines. We do not run a server that receives them, and we do not see them. We do not offer a hosted service for Studio today; if we offer one later, this policy will be updated before it launches.

When you use a coding agent or AI provider, such as Claude Code, Codex or another tool you configure, Studio sends your prompts, files and related content to that provider at your direction, under your own account with that provider. Each provider handles that data under its own terms and privacy policy.

Studio sends no product usage data to us. Usage events are off by default and go only to an analytics project that whoever runs the Studio service sets up and chooses.

## Google account data

Studio can connect a Google account so that agents in your projects can read your Gmail, Google Calendar and Google Drive. Connecting is optional.

**What Studio asks for.** Read-only access to whichever of Gmail (`gmail.readonly`), Google Calendar (`calendar.readonly`) and Google Drive (`drive.readonly`) you choose, plus your email address (`openid`, `email`). Studio cannot send email, change events, or edit, upload or delete files.

**How Studio uses it.** The Studio service on your machine reads your Gmail, Calendar or Drive only when an agent in a project where you turned that service on asks for it, as part of a task you gave that agent. The result goes to the coding agent and AI provider you configured for that project, only to carry out that task. Your email address is shown in Studio's settings and is available to agents in your projects, so they can tell which account is connected.

**Where it is stored.** Google's sign-in (refresh) token is saved in a file in Studio's data folder on the machine running the Studio service, readable only by your user account. Short-lived access tokens are kept in memory only. Messages, events and files are fetched when an agent needs them; Studio keeps no separate copy and sends nothing to a server we run.

**How long it is kept.** Google data an agent reads becomes part of that conversation. It stays in Studio's thread history on your machine until you delete the thread, and with your AI provider under its terms. Disconnecting deletes the stored token and email; deleting a thread removes data already read from your machine.

**Who receives it.** We never receive your Google data, so no one at SpecWeave reads it. It is not sold, not used for advertising, not used to build user profiles, and not used to develop, improve or train AI or machine-learning models. Studio sends it to your AI provider only to carry out your task and never for model training; check your provider's settings to make sure your content is not used for training.

**Removing access.** Disconnect in Studio under Settings > Google account. Studio asks Google to revoke its access and deletes the stored token and email from your machine, even if Google can't be reached. Remove also deletes a saved OAuth client and the project settings. If you disconnected while offline, also remove Studio at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

SpecWeave Studio's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## This website

spec-weave.com is a static site served by GitHub Pages. GitHub may log standard request data such as IP addresses to operate and secure its service; see the [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement). The site sets no advertising cookies.

## Children

SpecWeave and SpecWeave Studio are developer tools and are not directed at children under 13.

## Changes

If this policy changes, the new version is published on this page with a new effective date.

## Contact

Anton Abyzov, [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com).
