export function registerHelp(program) {
// Help text: the loop first, then a few everyday commands. Plumbing and legacy
// commands are registered with { hidden: true } and still run.
program.on('--help', () => {
  console.log('');
  console.log('The loop:');
  console.log('  $ specweave init                               # Set up SpecWeave in this folder');
  console.log('  $ specweave create-increment "Add login form"  # Plan: fill spec.md (Problem, ACs, Tasks)');
  console.log('  $ specweave task done T-01 --run "npm test"    # After the commit: run the task\'s Test, record it');
  console.log('  $ specweave verify                             # Run the project\'s build/test/lint commands');
  console.log('  $ specweave complete 0001                      # Close the increment');
  console.log('  $ specweave handoff --reason "out of tokens"   # Stop here; another tool or account continues');
  console.log('  $ specweave pickup                             # Continue handed-off work');
  console.log('');
  console.log('Also:');
  console.log('  $ specweave status                             # Increments and their progress');
  console.log('  $ specweave task next                          # The next open task with its acceptance criteria');
  console.log('  $ specweave sync setup                         # Connect GitHub Issues, Jira or Azure DevOps');
  console.log('  $ specweave doctor                             # Check project health');
  console.log('  $ specweave update                             # Update the CLI, instructions and skills');
  console.log('');
  console.log('Works with Claude Code, Codex, Cursor, Copilot, Gemini CLI and any tool that reads AGENTS.md.');
  console.log('More: https://spec-weave.com');
});

}
