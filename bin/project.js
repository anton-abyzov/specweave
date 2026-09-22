export function registerProjectCommand(program) {
  program.command('project <action>')
    .description('Portable project hub: init, show, set, brief, work-add, work-update, work-record, artifact-add, artifact-remove, routine-add, routine-remove')
    .option('--root <path>', 'Explicit project folder; otherwise resolve the enclosing umbrella')
    .option('--name <name>', 'Project name')
    .option('--goal <goal>', 'Project goal')
    .option('--context-file <file>', 'Read shared context from a UTF-8 file')
    .option('--revision <number>', 'Expected current hub or work revision', Number)
    .option('--title <title>', 'Work, artifact or routine title')
    .option('--summary <summary>', 'Work description')
    .option('--state <state>', 'backlog, active, blocked, review or done (planning state)')
    .option('--increment <id>', 'Link an existing increment')
    .option('--intent <id>', 'Existing work item ID')
    .option('--location <path-or-url>', 'Project-relative file or HTTPS URL; artifact ID for artifact-remove')
    .option('--cadence <cadence>', 'Human-readable requested cadence; does not schedule execution')
    .option('--instructions-file <file>', 'Read reusable routine instructions from a UTF-8 file')
    .option('--routine <id>', 'Routine ID for brief or routine-remove')
    .option('--harness <name>', 'Target codex, claude or generic; actual harness for work-record')
    .option('--model <model>', 'Actual model identity, if known')
    .option('--session <id>', 'Native session ID, if known')
    .option('--effort <effort>', 'Actual reasoning effort, if known')
    .option('--note <note>', 'Execution evidence or handoff note')
    .option('--json', 'JSON output, including errors')
    .action(async (action, options) => {
      const { projectCommand } = await import('../dist/src/cli/commands/project.js');
      await projectCommand(action, options);
    });
}
