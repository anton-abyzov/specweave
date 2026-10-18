---
title: Support
description: How to get help with SpecWeave, the SpecWithCode desktop app and the SpecWithCode iPhone app.
---

# Support

SpecWeave and SpecWithCode are made by Anton Abyzov. Here is how to get help.

## Contact

Email [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com). Say which app you use (the SpecWeave command-line tool, the SpecWithCode desktop app or the SpecWithCode iPhone app), its version, and what you expected to happen.

Bugs and feature requests can also go to [GitHub Issues](https://github.com/anton-abyzov/specweave/issues).

## SpecWithCode for iPhone

The iPhone app controls SpecWithCode running on your own computers. It needs SpecWithCode on at least one computer that the phone can reach.

**Pair a computer.** On the computer, open SpecWithCode and go to Settings > Connections. Turn on Network access or Tailscale HTTPS so the phone has an address to reach. Under Authorized clients, choose Create link. On the phone, tap Pair a machine, then scan the QR code or paste the link. A pairing link works once and expires after 5 minutes.

**A computer shows as offline.** The phone must be able to reach the computer: the same Wi-Fi network, Tailscale, or another address you set up. Check that SpecWithCode is running on the computer and that the iPhone app may use the local network (iPhone Settings > Privacy & Security > Local Network).

**Access expired.** Access to a computer lasts 30 days. In the last few days, that computer's page in the app shows when access ends. Create a new pairing link on the computer, then tap Pair again on that page.

**Remove a phone.** Removing a computer in the app deletes its token from the phone. To end the phone's access on the computer, revoke it under Settings > Connections > Authorized clients.

**Try it without a computer.** On the welcome screen, tap Explore with sample data to look around the app with sample projects.

## Guides

- [Quick start](/docs/getting-started)
- [Troubleshooting](/docs/guides/troubleshooting)
- [Privacy policy](/privacy)
