---
title: "Browsers for agents in SpecWithCode: the in-app browser and the SpecWithCode Browser extension"
sidebar_label: SpecWithCode Browser
description: "Agents in SpecWithCode can use a browser beside each thread, with separate profiles per account, or your real Chrome through the SpecWithCode Browser extension, in a visible tab group, on this computer only."
---

# Browsers for agents

Agents often need the web: a dashboard to read, a form to fill, a page to check after a deploy. SpecWithCode gives them two ways in, and you can watch and take over in both.

| | In-app browser | SpecWithCode Browser extension |
|---|---|---|
| Where it runs | Inside SpecWithCode, beside the thread | In your own Chrome profile |
| Signed in as | An in-app profile: imported cookies or a fresh login | You, with that Chrome profile's logins |
| Agents of | Every provider | Every provider |
| Turn it on | **Settings > Integrations > Agent browser access**, per project | **Settings > Chrome**, per machine |

## The in-app browser

Every thread has a browser beside it that you and the agent share: you watch and steer, the agent clicks and types. It has tabs, an address bar, DevTools, screenshots and screen recordings, element picking to send part of a page to the chat, a device toolbar for fixed viewports, and a list of the web servers running on the machine.

With agent browser access on, agents get the `preview_*` tools from SpecWithCode's MCP server (`preview_open`, `preview_navigate`, `preview_snapshot`, `preview_click`, `preview_type` and more). The tab an agent opens shows up beside its thread.

### One profile per account

Each browser profile keeps its own cookies and storage. Agent tabs use isolated storage unless you pick a profile for them.

1. **Settings > Integrations > Browser profiles > Import from**, then pick a browser and its profile, for example Chrome, "Work". Only cookies are copied, never saved passwords.
2. In the new profile's menu, choose **Use for agents**.
3. Repeat for each account, one in-app profile per account, so two logins to the same service never mix.

Cookie import works for Chrome, Edge, Brave, Vivaldi, Opera, Arc, Helium, Firefox and Safari on macOS.

## The SpecWithCode Browser extension

The extension lets agents use one of your real Chrome profiles: your tabs, your logins, on this computer only. Agents of every provider can use it. It is the way SpecWithCode recommends for agents to work in Chrome.

1. Open **Settings > Chrome** and pick the machine; each machine has its own Chrome.
2. Install the extension. While it is in Chrome Web Store review, choose **Load unpacked**: open `chrome://extensions` in the profile agents should use, turn on Developer mode, click **Load unpacked** and pick the folder SpecWithCode shows.
3. Choose **Show pairing code** and copy it.
4. Click the SpecWithCode icon in Chrome's toolbar, paste the code, name the profile (for example Work or Marketing) and click **Pair**.

From then on:

- Every tab an agent opens or works in sits in a visible "SpecWithCode" tab group with the profile's name.
- Drag a tab out of the group and it is yours again; the agent lets go of it.
- **Pause** in the extension stops all agent access at once. **Unpair** forgets the pairing.
- Chrome's own pages (`chrome://`, extension pages, DevTools) cannot be controlled.

The extension talks only to SpecWithCode on the same computer, over a loopback connection. A pairing code that points anywhere else is refused, so a pasted code cannot connect your browser to another machine. It has no server of its own, no analytics and no remote code. Details: [SpecWithCode Browser privacy policy](/specwithcode/chrome-extension-privacy).

## Why agents cannot drive your default Chrome profile directly

Since Chrome 136, Chrome refuses remote debugging on its default user-data folder, where your everyday profiles live, because malware used it to steal cookies. SpecWithCode does not work around that protection. Use the extension for a real profile, or import its cookies into an in-app profile.

For websites only; to work in native apps on the Mac, agents use [computer use](/docs/studio/computer-use).
