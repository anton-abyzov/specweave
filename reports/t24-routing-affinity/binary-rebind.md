# Repair an existing profile's executable

Discovery applies to newly prepared profiles. Existing profiles retain their recorded binary until an operator explicitly repairs it. Discovery and sign-in now reject legacy workbench paths and aliases that resolve into them. If no independent executable is verified, discovery reports no binary rather than a bare name that could search the rejected PATH again.

After installing the matching independent native executable, use the supported binary-only repair:

```sh
specweave-switch account binary codex-1 --binary "$HOME/.local/share/specweave/providers/bin/codex"
specweave-switch account binary claude-1 --binary "$HOME/.local/share/specweave/providers/bin/claude"
```

Run the appropriate command for each existing profile on its execution host. It requires an existing known profile, an absolute executable regular target outside legacy directories, and no active run for that profile. It verifies symlink targets and records the actual independent target. It changes only `account.binary`; native homes, credentials, config, quota, policy, history and IDs remain intact. Repeating a completed repair is a no-op. It neither signs in nor invokes a provider. Execution hosts with active native sessions outside Switch also require an operator preflight before maintenance.

A native launch selected before a concurrent rebind fails its reservation instead of executing the old binary. The operator can explicitly select again after the repair; no write run is retried automatically.

Source validation, 8 October 2026: the initial legacy-PATH regression failed and its receipt was retained. After repair, all 44 Switch tests passed using temporary fake native binaries. Coverage across state, CLI, policy and runner measured 95.01% lines, 87.33% branches and 92.31% functions. Tests covered seven-profile field preservation, native-file preservation, idempotency, invalid paths, legacy aliases, state locking, active account/run refusal, recorded sign-in refusal and stale launch reservation. Real native inference calls and live state changes: zero. This receipt does not claim installation or fleet migration.
