---
sidebar_position: 16
title: Increment numbers and identity
---

# Increment numbers and identity

Increment directories keep their readable number and name: `0001-login`, `9999-final-four-digit`, `10000-next`. Four digits are minimum padding. SpecWeave orders them numerically and reads existing three-digit names and imported `E`, `G`, `J`, and `A` suffixes. Existing directories, metadata and ledgers do not need renaming or backfilling.

Use `specweave create-increment "Title"` to create work. `task`, `verify`, `handoff` and `complete` accept the numeric alias or full name. An alias such as `1000` matches that whole number, never `10000`. When two existing increments share a number, use the full name; SpecWeave reports ambiguity instead of choosing one. New increments have an immutable `uuid` in metadata; commands using the common increment resolver can also use that UUID.

## Parallel creation on one machine

Creation first reserves the **number**, including every suffix variant, using an exclusive file. Linked Git worktrees share these reservations in Git's common directory, scoped by the planning root's relative location. The allocator also reads existing increments in each linked worktree, including `_archive`, `_abandoned`, `_paused` and `_backlog`. Standalone folders use `.specweave/state/increment-reservations/`.

Explicit IDs use the same reservation mechanism. Existing numbers and reservations cannot be reused. Low-level number suggestion APIs only suggest candidates; they do not reserve them. Use the increment creation API to reserve and create atomically with respect to other supported creators.

Reservations are permanent. A process interrupted before writing the increment may leave a gap or an empty reservation file. The next creation proceeds past it, without a stale lock to clear or a live process to evict. Do not delete reservation files to recover a gap: retaining them prevents reuse after interruption or deletion of old work. This protects against process interruption; it is not a power-loss durability guarantee for every filesystem.

## Separate clones and offline work

Separate Git clones and machines have independent allocators. They can allocate the same numeric alias while offline. The UUID distinguishes their new increments; it does **not** make their numeric folders globally unique or automatically merge their contents. After bringing independent histories together, preserve both increments and resolve numeric ambiguity using their full names or UUIDs. If both chose exactly the same directory name, resolve the Git conflict explicitly; never merge unrelated task ledgers merely because the folder names match.

Old tools with exact-four-digit assumptions cannot safely operate on new five-digit increments. Update the CLI in all participating tools before crossing that boundary. No historical renumbering or bulk migration is necessary.
