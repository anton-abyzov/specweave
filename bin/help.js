export function registerHelp(program) {
// Help text
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ specweave init my-saas                    # Create new project (auto-detect tool)');
  console.log('  $ specweave init my-saas --adapter cursor   # Create project for Cursor');
  console.log('  $ specweave init my-saas --language ru      # Create project with Russian language');
  console.log('  $ specweave status                          # Show all increments status');
  console.log('  $ specweave status --verbose                # Show detailed increment info');
  console.log('  $ specweave pause 0007 --reason "blocked"   # Pause increment 0007');
  console.log('  $ specweave resume 0007                     # Resume increment 0007');
  console.log('  $ specweave abandon 0007 --reason "obsolete" # Abandon increment 0007');
  console.log('  $ specweave qa 0008                         # Quick quality check');
  console.log('  $ specweave qa 0008 --pre                   # Pre-implementation check');
  console.log('  $ specweave qa 0008 --gate --export         # Quality gate + export to tasks');
  console.log('  $ specweave sync status                     # Token/account, provider health, sync gaps');
  console.log('  $ specweave sync push 0008                  # Push increment progress to GitHub/Jira/ADO');
  console.log('  $ specweave sync pull --since 3             # Show external changes from the last 3 days');
  console.log('  $ specweave sync setup --validate           # Validate tracker configuration + credentials');
  console.log('  $ specweave doctor --fix-status             # Fix metadata/spec status desyncs');
  console.log('  $ specweave refresh-plugins                 # Refresh core SpecWeave plugin');
  console.log('  $ specweave refresh-plugins --all           # Refresh every installed plugin');
  console.log('  $ specweave refresh-plugins --force         # Force reinstall (skip hash check)');
  console.log('  $ specweave update                          # Update CLI + instructions + config');
  console.log('  $ specweave update --plugins                # Also refresh marketplace plugins');
  console.log('  $ specweave update --no-self                # Skip CLI update, only project files');
  console.log('  $ specweave update --check                  # Dry run - preview changes');
  console.log('');
  console.log('Plugin Management (use Claude CLI commands):');
  console.log('  $ claude plugin install sw@specweave        # Install core SpecWeave');
  console.log('  $ claude plugin list                        # Show installed plugins');
  console.log('  $ vskill install anton-abyzov/vskill --plugin mobile  # Install domain plugin');
  console.log('');
  console.log('Supported AI Tools:');
  console.log('  - Claude Code (full automation) - Native skills, agents, hooks');
  console.log('  - Cursor (semi-automation) - .cursorrules, @ shortcuts');
  console.log('  - GitHub Copilot (basic) - Workspace instructions');
  console.log('  - Generic (manual) - Works with ANY AI (ChatGPT, Gemini, etc.)');
  console.log('');
  console.log('For more information, visit: https://spec-weave.com');
});

}
