---
title: Privacy Policy
description: How SpecWeave, SpecWithCode and spec-weave.com handle your information, including data read from your Google account.
---

# Privacy Policy

Effective 1 November 2026.

This policy covers the SpecWeave command-line tool, the SpecWithCode desktop app and service, the SpecWithCode iPhone and Android apps, and this website, spec-weave.com. They are made by Anton Abyzov ("we"). Questions go to [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com).

## Where your data lives

SpecWeave and SpecWithCode run on machines you own. Your projects, specs, prompts, agent conversations, settings and sign-ins stay on those machines. We do not run a server that receives them, and we do not see them. We do not offer a hosted service for SpecWithCode today; if we offer one later, this policy will be updated before it launches.

When you use a coding agent or AI provider, such as Claude Code, Codex or another tool you configure, SpecWithCode sends your prompts, files and related content to that provider at your direction, under your own account with that provider. Each provider handles that data under its own terms and privacy policy.

SpecWithCode sends no product usage data to us. Usage events are off by default and go only to an analytics project that whoever runs the SpecWithCode service sets up and chooses.

## Google account data

SpecWithCode can connect a Google account so that agents in your projects can read your Gmail, Google Calendar and Google Drive. Connecting is optional.

**What SpecWithCode asks for.** Read-only access to whichever of Gmail (`gmail.readonly`), Google Calendar (`calendar.readonly`) and Google Drive (`drive.readonly`) you choose, plus your email address (`openid`, `email`). SpecWithCode cannot send email, change events, or edit, upload or delete files.

**How SpecWithCode uses it.** The SpecWithCode service on your machine reads your Gmail, Calendar or Drive only when an agent in a project where you turned that service on asks for it, as part of a task you gave that agent. The result goes to the coding agent and AI provider you configured for that project, only to carry out that task. Your email address is shown in SpecWithCode's settings and is available to agents in your projects, so they can tell which account is connected.

**Where it is stored.** Google's sign-in (refresh) token is saved in a file in SpecWithCode's data folder on the machine running the SpecWithCode service, readable only by your user account. Short-lived access tokens are kept in memory only. Messages, events and files are fetched when an agent needs them; SpecWithCode keeps no separate copy and sends nothing to a server we run.

**How long it is kept.** Google data an agent reads becomes part of that conversation. It stays in SpecWithCode's thread history on your machine until you delete the thread, and with your AI provider under its terms. Disconnecting deletes the stored token and email; deleting a thread removes data already read from your machine.

**Who receives it.** We never receive your Google data, so no one at SpecWeave reads it. It is not sold, not used for advertising, not used to build user profiles, and not used to develop, improve or train AI or machine-learning models. SpecWithCode sends it to your AI provider only to carry out your task and never for model training; check your provider's settings to make sure your content is not used for training.

**Removing access.** Disconnect in SpecWithCode under Settings > Google account. SpecWithCode asks Google to revoke its access and deletes the stored token and email from your machine, even if Google can't be reached. Remove also deletes a saved OAuth client and the project settings. If you disconnected while offline, also remove SpecWithCode at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

SpecWithCode's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## SpecWithCode Browser extension

The SpecWithCode Browser extension for Chrome has its own policy: [SpecWithCode Browser privacy policy](/specwithcode/chrome-extension-privacy/).

## SpecWithCode for iPhone

The SpecWithCode iPhone app connects only to the computers you pair it with: the addresses in the pairing links you use, and other addresses those computers report for reaching them. It has no account with us, no analytics, no advertising and no tracking, and it sends nothing to us. If you turn on sharing with app developers in your iPhone's analytics settings, Apple may share crash reports with us.

The app sends your messages only to your own computers, and replies come back only from them. SpecWithCode on the computer passes your messages to the coding agent or AI provider you set up there, as described above. On a local network the connection can be unencrypted HTTP; on a network you don't trust, pair using a secure (HTTPS) address instead.

On the phone, the app keeps the list of computers you paired: each computer's name and ID, its addresses, whether it is turned on, and how far the app has synced. This list is a file in the app's storage and is included in your device backups. Access tokens, valid for 30 days, are kept in the iOS Keychain on this phone only; they are not synced to iCloud or moved to another device. The app also keeps your appearance setting and the device name you choose, and sends that name to a computer when you pair so the computer can show which phone it is. Messages, replies and drafts are not saved on the phone.

The camera is used only to scan the pairing QR code, and local network access only to reach your own computers.

Removing a computer in the app deletes its addresses and tokens from the phone, but does not tell the computer. To end the phone's access sooner, revoke it in SpecWithCode on that computer, under Settings > Connections > Authorized clients. Otherwise access ends after 30 days.

## SpecWithCode for Android

The SpecWithCode Android app controls SpecWithCode on computers you own. It reaches them in one of two ways.

**SpecWithCode Connect (optional).** You sign in with a SpecWithCode account. Sign-in is handled by Clerk, our authentication provider, which stores your email address, your name and the sign-in method you chose (for example Google or GitHub). The app then asks the SpecWithCode relay (relay.spec-weave.com) for the computers linked to your account and for a one-time credential to open one of them. After that, the app talks to your computer directly through that computer's own tunnel address. The relay does not carry your messages, replies or files. To delete your account and the data Clerk holds for it, email us from the address you signed in with.

**Direct pairing.** You pair with a link or QR code from SpecWithCode on your computer. No account is needed, and nothing goes through our relay.

Either way, the app sends your messages only to your own computers, and replies come back only from them. SpecWithCode on the computer passes your messages to the coding agent or AI provider you set up there, as described above. The app keeps the list of computers you can reach, its sign-in tokens and your settings in its private storage on the phone. It has no analytics, no advertising and no tracking. The camera is used only to scan a pairing QR code. Notifications about your agents are created on the phone from what your computers report.

## This website

spec-weave.com is a static site served by GitHub Pages. GitHub may log standard request data such as IP addresses to operate and secure its service; see the [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement). The site sets no advertising cookies.

## Children

SpecWeave and SpecWithCode are developer tools and are not directed at children under 13.

## Changes

If this policy changes, the new version is published on this page with a new effective date.

## Contact

Anton Abyzov, [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com). For help with the apps, see [Support](/support).
