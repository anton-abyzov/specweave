---
title: SpecWithCode Browser privacy policy
description: What the SpecWithCode Browser Chrome extension handles, where that data goes, and what it never does.
---

# SpecWithCode Browser privacy policy

Effective date: October 16, 2026

This policy covers the SpecWithCode Browser extension for Google Chrome ("the extension"), published by Anton Abyzov. It explains what the extension handles, where that data goes, and what it never does.

## Summary

The extension connects one Chrome profile to the SpecWithCode desktop app running on the same computer. Everything it handles travels only between Chrome and that app over a loopback connection (127.0.0.1). The extension has no server of its own, sends nothing to the developer or to any third party, contains no analytics, advertising or tracking code, and loads no remote code.

## What the extension does

When you pair it with a code from SpecWithCode (Settings › Chrome), the extension opens a WebSocket to `ws://127.0.0.1:<port>/api/browser-relay` on your own computer. The pairing code is checked before use: it is rejected unless it points at a loopback address, so a pasted code can never connect your browser to another machine.

While the profile is paired and not paused, the agents you run in SpecWithCode can ask the extension to open tabs, read pages, click, type and take screenshots in this Chrome profile. Every tab an agent controls sits in a visible blue "SpecWithCode" tab group. Dragging a tab out of the group hands it back to you and the agent's access to it ends. Pause stops all agent access; Unpair deletes the pairing.

## Data the extension handles

**Pairing token (authentication information).** The pairing code contains the local address of SpecWithCode, a random token and your computer's name. The extension stores these in `chrome.storage.local` on your computer and sends the token only to SpecWithCode on the same computer to prove it is the paired profile. Unpair deletes it.

**Profile name and settings.** The name you give this Chrome profile (for example "Personal") and the paused/active setting are stored in `chrome.storage.local`. The name is shown in the tab group title and sent to SpecWithCode so you can tell profiles apart.

**Website content.** When an agent works in a tab, that tab's content (text, page structure, screenshots) is passed to SpecWithCode on your computer through the Chrome debugger API. The extension does not keep a copy. Every tab an agent attaches to is moved into the SpecWithCode tab group, where you can see it; the content of tabs outside the group is not read.

**Open tabs (web history).** So an agent can find or reuse a tab, SpecWithCode can ask for the list of open tabs in this profile (their URLs and titles) and open, switch to or close tabs. This list goes only to SpecWithCode on your computer. The extension does not read your browsing history.

**Browser details.** On connecting, the extension tells SpecWithCode its own version, its extension ID and Chrome's user-agent string, so the app can show which browser is connected.

## Where the data goes

All of the above goes only to the SpecWithCode desktop app on the same computer. What happens next is decided by you inside SpecWithCode: an agent you run there may send page content to the AI provider you chose for that agent (for example Anthropic for Claude, OpenAI for Codex, xAI for Grok, Google for Gemini, GitHub for Copilot, or Meta for Muse), under that provider's own terms and privacy policy. The extension itself never contacts those providers or any other server.

## What the extension never does

- It does not sell, rent or share data with anyone.
- It does not send data to the developer, an analytics service or an advertiser.
- It does not use data for advertising, credit decisions or any purpose unrelated to letting your own agents use the browser.
- It does not load or run remote code.
- It does not read the content of tabs outside the SpecWithCode tab group, and cannot debug Chrome's internal pages (chrome://, extension pages, DevTools).

## Retention and deletion

Settings and the pairing token stay in Chrome's local extension storage until you click Unpair or remove the extension, which deletes them. Page content is not retained by the extension.

## Children

The extension is a developer tool and is not directed at children under 13.

## Open source

The extension is open source under the Apache License 2.0 and is derived in part from Microsoft's Playwright MCP Bridge extension (Playwright, Copyright Microsoft Corporation, Apache-2.0). You can read exactly what it does in its source.

## Changes

If this policy changes, the new version will be posted at this address with a new effective date. A change that widens what the extension handles will be described in the extension's release notes before it ships.

## Contact

Questions or requests: https://spec-weave.com (SpecWithCode) or anton.abyzov@gmail.com.
