---
title: Privacy Policy
description: How SpecWeave, SpecWeave Studio and spec-weave.com handle your information, including data read from your Google account.
---

# Privacy Policy

Effective 11 October 2026.

This policy covers the SpecWeave command-line tool, the SpecWeave Studio desktop app and service, and this website, spec-weave.com. They are made by Anton Abyzov ("we"). Questions go to [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com).

## Where your data lives

SpecWeave and SpecWeave Studio run on machines you own. Your projects, specs, prompts, agent conversations, settings and sign-ins stay on those machines. We do not run a server that receives them, and we do not see them.

When you use a coding agent or AI provider, such as Claude Code, Codex or another tool you configure, Studio sends your prompts, files and related content to that provider at your direction. Each provider handles that data under its own terms and privacy policy.

Studio sends no product usage data to us. Usage events are off by default and go only to an analytics project that whoever runs the Studio service sets up and chooses.

## Google account data

Studio can connect a Google account so that agents in your projects can read your Gmail, Google Calendar and Google Drive. Connecting is optional.

**What Studio asks for.** Read-only access to Gmail (`gmail.readonly`), Google Calendar (`calendar.readonly`) and Google Drive (`drive.readonly`), plus your email address (`openid`, `userinfo.email`). Studio cannot send email, change events, or edit, upload or delete files.

**How Studio uses it.** The Studio service on your machine reads your Google data only when an agent in a project where you turned that service on asks for it, as part of work you gave that agent. The result goes to the coding agent and AI provider you configured for that project. Your email address is shown in Studio's settings so you can see which account is connected.

**Where it is stored.** Google's sign-in token is kept in the secret store of the machine running the Studio service. Messages, events and files are fetched when needed and are not copied to any server we run.

**Who receives it.** Google data is not sent to us. It is not sold, not used for advertising, not used to build user profiles, and not used to train AI models. A person reads it only when you ask for that, for example to debug a problem you report, or when the law requires it.

**Removing access.** Disconnect in Studio under Settings > Google account. That revokes Studio's access at Google and deletes the stored token. You can also remove access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

SpecWeave Studio's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## This website

spec-weave.com is a static site served by GitHub Pages. GitHub may log standard request data such as IP addresses to operate and secure its service; see the [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement). The site sets no advertising cookies.

## Children

SpecWeave and SpecWeave Studio are developer tools and are not directed at children under 13.

## Changes

If this policy changes, the new version is published on this page with a new effective date.

## Contact

Anton Abyzov, [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com).
