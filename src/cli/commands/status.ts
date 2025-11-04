import { showStatus, StatusOptions } from '../../core/increment/status-commands.js';
import { IncrementType } from '../../core/types/increment-metadata.js';

interface StatusCommandOptions {
  verbose?: boolean;
  type?: string;
}

/**
 * CLI command to show increment status overview
 *
 * @param options - Command options (verbose, type filter)
 */
export async function statusCommand(options: StatusCommandOptions = {}): Promise<void> {
  const statusOptions: StatusOptions = {
    verbose: options.verbose
  };

  // Validate and convert type if provided
  if (options.type) {
    const validTypes: string[] = ['feature', 'hotfix', 'bug', 'change-request', 'refactor', 'experiment'];
    if (!validTypes.includes(options.type)) {
      console.error(`Invalid type: ${options.type}`);
      console.error(`Valid types: ${validTypes.join(', ')}`);
      process.exit(1);
    }
    statusOptions.type = options.type as IncrementType;
  }

  await showStatus(statusOptions);
}
