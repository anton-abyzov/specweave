---
title: Services
description: Manage running services, detect port conflicts, and access external project links
---

# Services

The Services page gives you control over the services defined in your project and quick access to external links. It shows which services are running, what ports they occupy, and lets you start or stop them directly from the dashboard.

## KPI Summary

Four cards summarize the current state:

- **Services** -- total number of managed services.
- **Running** -- how many services are currently active.
- **External Links** -- number of configured external links (docs, repos, etc.).
- **Stopped** -- services that are not currently running.

## Port Conflict Warning

When two or more running services are bound to the same port, an amber warning banner appears at the top of the page. The banner includes:

- A warning icon.
- A "Port Conflict Detected" heading.
- A line for each conflicting port listing the port number and the names of all services sharing it.

This detection runs on every page load and after every start/stop operation, so conflicts are surfaced immediately. Resolving the conflict requires changing the port in your service configuration (via the [Config](./config.md) page or by editing `config.json` directly) and restarting the affected services.

## Service Status

A list of all managed services, each displayed as a row with:

- A colored status dot (green for running, gray for stopped).
- The service name.
- A detail line -- for running services, this is a clickable URL that opens in a new tab. For stopped services, it shows descriptive text.
- A port badge (e.g. `Port 3000`) when the service is running on a detected port.
- A status badge (Running or Stopped).

### Start and Stop Controls

Services that have both a `startCommand` and `stopCommand` defined get interactive controls:

- **Running services** show an **Open** link (opens the service URL) and a **Stop** button.
- **Stopped services** show a **Start** button.

Both start and stop operations run the configured command and then refresh the service list after a short delay to pick up the new state. If a service only has partial command configuration, running services still get an **Open** link.

## Command Output

When a start or stop command is executing, a command output panel appears below the page header showing live output from the command. The panel displays:

- Streaming stdout/stderr lines from the command.
- A status indicator showing whether the command is still running, succeeded, or failed.
- A dismiss button to close the output panel after reviewing.

Start commands have a 5-minute timeout to accommodate services that take time to initialize. After the command completes, the service list refreshes automatically to pick up the new state.

## External Links

Below the service list, a grid of configured external links is displayed. Each link card shows:

- A colored icon badge based on link type (indigo for docs, gray for GitHub, blue for JIRA/ADO).
- The link name.
- A truncated URL.
- An external-link arrow icon.

Clicking a card opens the URL in a new tab. If no links are configured, a message indicates that.

Links are configured in the project's `config.json` under the `links` array. Each entry needs a `name`, `url`, and `type` (e.g. `docs`, `github`, `jira`, `ado`). The type determines the icon color shown on the card.

## Link Types

The icon badge color is determined by the link type:

| Type | Color |
|------|-------|
| `docs` | Indigo |
| `github` | Gray |
| `jira` | Blue |
| `ado` | Blue |

Any unrecognized type defaults to a gray badge.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Services** page from the sidebar. Service status is fetched on page load; start/stop actions refresh the status automatically.

## See Also

- [Config](./config.md) -- define services and external links in the configuration editor
- [Activity](./activity.md) -- service start/stop events appear in the activity stream
- [Notifications](./notifications.md) -- service-related alerts and warnings
