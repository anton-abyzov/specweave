---
title: Studio projects
description: Organize ongoing work with a coordinator, independent Claude Code and Codex threads, shared memory and project settings.
---

# Studio projects

A project groups work around an outcome, shared memory and tools. Code projects can combine a working folder with several repository URLs; Personal projects start without choosing a folder or creating a Git repository. Its coordinator keeps the conversation together; worker threads carry out individual assignments. Choose a provider and model for each thread, including the coordinator. A project can contain both Claude Code and Codex workers.

:::info 0.2 preview
This guide describes the Studio 0.2 implementation under release verification. Public installation and recorded tutorials will be added after artifact and application acceptance. The SpecWeave CLI installation guide installs the CLI, not Studio.
:::

## Set up your project

Open the project from Studio's overview, then choose **Project settings**. Give it a clear name and goal, such as “Make checkout reliable on mobile.” Select the coordinator model and the default worker model independently. Available choices come from providers configured on that host; an example model name does not guarantee that your account offers it.

Use **Memory → Project instructions** for standing rules: the target branch, useful test commands and decisions that apply to all work. Keep the goal about the outcome. Put detailed facts in [project memory](./memory-and-usage.md).

## Personal projects and quick chats

Open **New project**, then choose **Personal project** for your preferences, planning, research or ongoing personal work. Studio creates a managed folder on the selected device without initializing Git. You get the same coordinator, threads, memory, plans, routines and usage views as a code project. Add repositories or additional folders later if they become useful.

Personal memory belongs to that project. It does not automatically include other projects, your home directory, Gmail, Calendar or Drive. Connect tools explicitly under **Project settings → Environment → Connections**. A Personal project is our version of a personal assistant workspace; it does not connect to or synchronize an OpenAI Dot.

Choose **New thread without a project** for a one-off question, or **Standalone chat on…** to select its execution machine explicitly. Studio creates the working location automatically, so you do not need to select a repository or project folder just to ask something.

## Use folders and repository URLs together

**Project settings → Environment** keeps these choices separate:

| Choice | What it controls |
| --- | --- |
| Execution folder | The project's working location on its selected machine. |
| Approved additional folders | Existing folders new work can access, subject to the provider's permissions. |
| Repositories | Multiple remote URLs, each optionally associated with a checkout path. |
| Connections | External tools explicitly enabled for this project on the same machine. |

An umbrella folder can hold several repositories. To associate a repository already on disk, enter its **Repository URL**, choose **Add URL**, fill in **Checkout path**, and choose **Save changes**, then **Match existing checkout**. Studio checks the actual remote identity. To make a checkout, save the URL first and choose **Prepare checkout**. With an empty checkout path, preparation uses a new managed destination. A specified destination must be inside an approved folder. Preparation never replaces an existing directory.

A URL is a reference until its checkout is prepared or matched. Missing folders and mismatched remotes have explicit states. If preparation is interrupted, Studio retains the command receipt and does not automatically clone again. Inspect the destination before choosing **I inspected the destination; allow a new request**. That only permits a later explicit attempt; saving settings alone does not clone a repository.

Stop active project work before changing folder access. Already running native processes cannot silently lose a folder permission; new work receives the saved grants. Pause or archive blocks executable preparation and connection checks until you resume or restore the project. Ordinary settings remain editable.

Choose the current device by default; select a different connected host when the work should execute there. Paths and sign-in belong to that host. A matching Git remote does not merge projects on different machines, synchronize their memory, or transfer provider credentials. Studio's connected-host support does not provision a cloud VM or make a local thread run while its execution device is offline.

### Do I need a GitHub OAuth app ID?

For device-based clone, fetch and checkout operations, use that device's existing Git HTTPS credential helper, SSH configuration or GitHub CLI sign-in. You do not need to register a new Studio OAuth app to save repository URLs or use those credentials. See [GitHub's authentication guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github).

A hosted repository picker or a service acting independently of your machine is a different integration. GitHub recommends a [GitHub App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps) for fine-grained repository permissions and short-lived installation credentials. Studio 0.2 does not claim that hosted authorization flow: do not paste tokens into repository URLs, project instructions or memory.

## Connect personal tools

Connections use a locally installed **stdio MCP server**. Install and sign in to the selected server on the project's execution device using its own documented setup. Saving a command in Studio does not create an account, register an OAuth application or sign you in.

1. Open **Project settings → Environment → Connections → New connection**.
2. Enter a name, the MCP executable, and one argument per line. If needed, enter the **names** of environment variables already configured for the Studio process on that device; never enter their values here.
3. Choose **Save connection**, then **Check and discover tools**. Studio starts the command and discovers its tools. A ready connection confirms protocol access; it does not prove every external account permission works.
4. Select the specific tools this project may call, then choose **Save connection** to save the grants. Other projects do not inherit them.
5. Use **Revoke connection** to stop future calls. An external action already submitted cannot be undone by revocation; an in-flight call finishes or reaches its bounded timeout first.

The command runs as the device's user account, so enable only servers you trust. Project tool grants control Studio's relay; they are not an operating-system sandbox around the external server. Tool descriptions and results remain untrusted content and cannot grant new permissions.

The [official GitHub MCP server](https://github.com/github/github-mcp-server#local-github-mcp-server) is one example: use its installed executable with the `stdio` argument and the required host environment variable names. Its remote HTTP/OAuth endpoint is a separate transport and is not a stdio executable.

For Gmail, Calendar or Drive, choose a compatible Workspace MCP server and follow that server's OAuth setup. For example, the [community Google Workspace MCP server](https://github.com/taylorwilsdon/google_workspace_mcp) documents its own Google OAuth configuration. It is a separate community project, not a built-in Google connection or an authentication service operated by Studio. The [Google Workspace CLI](https://github.com/googleworkspace/cli) is also a separate tool; do not assume a CLI command implements the MCP protocol.

To use a revoked connection again, choose **Restore configuration**, then **Check and discover tools**, select tools and **Save connection**. Restoring does not restore previous tool grants.

Changing a connection command or its discovered tool definitions clears the old grants. Review and save them again. A lost response does not authorize replay: Studio records a call before dispatch and reuses its receipt for the same request. An unknown outcome requires checking the connected service before starting a new request.

## Work through the coordinator

Send a question or assignment in the project conversation. For a follow-up, name the existing thread or describe the work it owns. Reusing the right worker preserves its native conversation; starting a different provider creates a separate conversation.

Click a thread row or a linked thread reference to open it in the right pane. Read its transcript, inspect messages from the coordinator and use its native controls. **Replies from the project’s thread pane pass through the coordinator**, with the selected worker attached as context. The coordinator decides whether to reuse that worker or route elsewhere. Tool approvals remain attached to the specific native request; a general project message is not an approval.

Images and files attached to a reply follow that same coordinator route. Review the attachments in the coordinator conversation; the worker pane does not turn a routed reply into a direct native submission. If the response is lost, retry the retained request rather than sending another copy. Studio retains the delivery receipt across restart and expired upload staging.

Answer a native approval or question in the worker that requested it. Credit spending consent applies only to an explicit direct submission to that provider and model. A project reply cannot transfer that consent to a coordinator or a different worker.

The thread list separates attention from execution:

| Group | Meaning |
| --- | --- |
| Waiting on you | Input, approval or plan review is needed, or the thread has failed or reached a usage limit. |
| Working | The native runtime is active. |
| Idle | The thread is available for another message. |
| Resolved | The thread has been marked settled. Reopen it when related work returns. |
| Archived | The thread is retained in archived history and can be restored. |

Resolving a thread organizes the conversation. It does not prove that tests passed, a change was deployed or acceptance criteria were met. Use [plans and verification](./plans-and-routines.md) when you need that evidence.

## Pause, archive or delete

**Pause new work** blocks new coordinator and routine dispatch. Existing native turns keep their own stop and approval controls. **Archive project** also blocks new work and preserves history; unarchive it to continue. Neither action silently takes over or cancels a running worker.

**Danger zone → Delete project and threads** permanently removes the project, its Studio threads, shared memory, plans, captured evidence, attachments, connection configuration and receipts, and routines. Type the exact project name to confirm. Active work or a pending native request must be finished or stopped first. Source folders and remote Git branches remain intact. Deletion cannot be undone in Studio.

If another window changed the settings, reload the current version before saving again. Review your retained draft instead of overwriting someone else's update.

## Next steps

- [Memory, context and usage](./memory-and-usage.md)
- [Plans and project routines](./plans-and-routines.md)
- [Claude Projects and portable work](../guides/claude-code-projects.md)
