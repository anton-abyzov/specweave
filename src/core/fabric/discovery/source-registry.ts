/**
 * Source Registry — Pluggable Discovery Provider Framework
 *
 * Orchestrates multiple skill discovery providers (GitHub, skills.sh, npm)
 * and yields deduplicated results.
 */

import type { GitHubRepoInfo } from '../submission-queue-types.js';

export interface DiscoveryProvider {
  name: string;
  discover(): AsyncGenerator<GitHubRepoInfo>;
}

export interface DiscoverOptions {
  enabledSources?: string[];
}

export class SourceRegistry {
  private _providers: DiscoveryProvider[] = [];

  get providers(): DiscoveryProvider[] {
    return [...this._providers];
  }

  register(provider: DiscoveryProvider): void {
    this._providers.push(provider);
  }

  async *discoverAll(options?: DiscoverOptions): AsyncGenerator<GitHubRepoInfo> {
    const seen = new Set<string>();
    const enabled = options?.enabledSources;

    for (const provider of this._providers) {
      if (enabled && !enabled.includes(provider.name)) {
        continue;
      }

      try {
        for await (const repo of provider.discover()) {
          if (!seen.has(repo.fullName)) {
            seen.add(repo.fullName);
            yield repo;
          }
        }
      } catch {
        // Provider failed — skip and continue with others
      }
    }
  }
}
