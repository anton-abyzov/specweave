---
title: Config
description: Edit SpecWeave configuration with live validation, type-aware fields, and section-based navigation
---

# Config

The Config page provides a visual editor for your project's `.specweave/config.json` file. Instead of editing JSON by hand, you get type-aware form fields, inline validation, and section-based navigation.

## Page Header

The header shows the page title and the file path (`.specweave/config.json`). On the right side, contextual controls appear as you make changes:

- A badge showing the number of pending changes (e.g. `3 changes`).
- A **Discard** button to revert all unsaved edits.
- A **Save Changes** button that validates and persists your edits.
- A status message confirming success or showing the error.

## General Settings

Top-level scalar values (strings, numbers, booleans) that are not nested inside an object section appear in a **General** panel at the top. Each field is rendered with the appropriate input control based on its type.

## Collapsible Sections

Every top-level object key in the config (e.g. `sync`, `testing`, `hooks`, `umbrella`) becomes a collapsible section. Click the section header to expand or collapse it. The header also shows:

- A badge indicating how many fields within that section have been edited.
- An `errors` badge if any validation errors exist under that section path.

## Field Types

The editor renders different controls based on the value type:

| Type | Control |
|------|---------|
| Boolean | Toggle switch (indigo when on, gray when off) |
| Number | Numeric input field, right-aligned |
| String | Text input field |
| Array | Expandable list with item count, remove buttons per item, and an add input |
| Nested Object | Recursively rendered sub-section (up to 4 levels deep) |

Edited fields get a subtle amber ring to visually distinguish them from unmodified values.

## Array Editing

Array fields display as a clickable row showing the item count (e.g. `[3 items]`). An amber dot appears next to edited arrays. Expanding an array reveals:

- Each item with a **remove** button (visible on hover).
- An **Add** input at the bottom with Enter-to-submit and an explicit Add button.
- An empty state message when the array has no items.

All array modifications (adding or removing items) are tracked as pending changes and require saving to persist.

## Validation

When you click **Save Changes**, the editor runs a two-step process:

1. **Validate** -- sends the partial config to `/api/config/validate`. If there are validation errors, they appear in a red banner at the top listing each error with its dot-path and message. The corresponding fields also show inline error text in red.
2. **Save** -- if validation passes, the config is persisted via a PUT to `/api/config`. A green success banner confirms the save.

Editing a field that previously had a validation error clears that specific error immediately.

## Real-Time Updates

The page subscribes to the `config-changed` SSE event. If the config is modified externally (e.g. via the CLI or another browser tab), the displayed data refreshes automatically.

## Partial Updates

The editor uses a partial update model. Only the fields you actually change are sent to the server. The dot-path notation (e.g. `sync.github.owner`) is used internally to track which fields have been modified. When saving, these dot-paths are reassembled into a nested JSON object for the API request.

This means you can safely edit one field in a large config without risk of accidentally overwriting other sections that may have been modified externally since the page loaded.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Config** page from the sidebar. Changes are project-scoped -- the active project is included in all API requests.

## See Also

- [Sync](./sync.md) -- sync platform settings that are edited through this config
- [Plugins](./plugins.md) -- plugin configuration managed via config sections
- [Services](./services.md) -- service definitions referenced from config
