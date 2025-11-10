/**
 * GitHub Issue Updater for Living Docs Sync
 *
 * Handles updating GitHub issues with living documentation links and content.
 * Used by post-task-completion hook to keep GitHub issues in sync with SpecWeave docs.
 *
 * @module github-issue-updater
 */
import fs from 'fs-extra';
import path from 'path';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
/**
 * Update GitHub issue with living docs section
 */
export async function updateIssueLivingDocs(issueNumber, livingDocs, owner, repo) {
    console.log(`📝 Updating GitHub issue #${issueNumber} with living docs...`);
    // 1. Get current issue body
    const currentBody = await getIssueBody(issueNumber, owner, repo);
    // 2. Build living docs section
    const livingDocsSection = buildLivingDocsSection(livingDocs, owner, repo);
    // 3. Update or append living docs section
    const updatedBody = updateBodyWithLivingDocs(currentBody, livingDocsSection);
    // 4. Update issue
    await updateIssueBody(issueNumber, updatedBody, owner, repo);
    console.log(`✅ Living docs section updated in issue #${issueNumber}`);
}
/**
 * Post comment about ADR/HLD/diagram creation
 */
export async function postArchitectureComment(issueNumber, docPath, owner, repo) {
    const docType = getDocType(docPath);
    const docName = path.basename(docPath, '.md');
    const docUrl = `https://github.com/${owner}/${repo}/blob/develop/${docPath}`;
    const comment = `
🏗️ **${docType} Created**

**Document**: [${docName}](${docUrl})

**Path**: \`${docPath}\`

---
🤖 Auto-updated by SpecWeave
`.trim();
    await postComment(issueNumber, comment, owner, repo);
    console.log(`✅ Posted ${docType} comment to issue #${issueNumber}`);
}
/**
 * Post scope change comment
 */
export async function postScopeChangeComment(issueNumber, changes, owner, repo) {
    const parts = ['**Scope Change Detected**', ''];
    if (changes.added && changes.added.length > 0) {
        parts.push('**Added**:');
        changes.added.forEach(item => parts.push(`- ✅ ${item}`));
        parts.push('');
    }
    if (changes.removed && changes.removed.length > 0) {
        parts.push('**Removed**:');
        changes.removed.forEach(item => parts.push(`- ❌ ${item}`));
        parts.push('');
    }
    if (changes.modified && changes.modified.length > 0) {
        parts.push('**Modified**:');
        changes.modified.forEach(item => parts.push(`- 🔄 ${item}`));
        parts.push('');
    }
    if (changes.reason) {
        parts.push(`**Reason**: ${changes.reason}`);
        parts.push('');
    }
    if (changes.impact) {
        parts.push(`**Impact**: ${changes.impact}`);
        parts.push('');
    }
    parts.push('---');
    parts.push('🤖 Auto-updated by SpecWeave');
    await postComment(issueNumber, parts.join('\n'), owner, repo);
    console.log(`✅ Posted scope change comment to issue #${issueNumber}`);
}
/**
 * Post status change comment (pause/resume/abandon)
 */
export async function postStatusChangeComment(issueNumber, status, reason, owner, repo) {
    const emoji = {
        paused: '⏸️',
        resumed: '▶️',
        abandoned: '🗑️'
    }[status];
    const title = {
        paused: 'Increment Paused',
        resumed: 'Increment Resumed',
        abandoned: 'Increment Abandoned'
    }[status];
    const comment = `
${emoji} **${title}**

**Reason**: ${reason}

**Timestamp**: ${new Date().toISOString()}

---
🤖 Auto-updated by SpecWeave
`.trim();
    await postComment(issueNumber, comment, owner, repo);
    console.log(`✅ Posted ${status} comment to issue #${issueNumber}`);
}
/**
 * Collect living docs for an increment
 */
export async function collectLivingDocs(incrementId) {
    const livingDocs = {
        specs: [],
        architecture: [],
        diagrams: []
    };
    // 1. Find specs
    const specsDir = path.join(process.cwd(), '.specweave/docs/internal/specs');
    if (await fs.pathExists(specsDir)) {
        const specFiles = await fs.readdir(specsDir);
        for (const file of specFiles) {
            if (file.endsWith('.md') && !file.startsWith('README')) {
                livingDocs.specs.push(path.join('.specweave/docs/internal/specs', file));
            }
        }
    }
    // 2. Find architecture docs (ADRs, HLDs)
    const archDir = path.join(process.cwd(), '.specweave/docs/internal/architecture');
    if (await fs.pathExists(archDir)) {
        // ADRs
        const adrDir = path.join(archDir, 'adr');
        if (await fs.pathExists(adrDir)) {
            const adrFiles = await fs.readdir(adrDir);
            for (const file of adrFiles) {
                if (file.endsWith('.md')) {
                    livingDocs.architecture.push(path.join('.specweave/docs/internal/architecture/adr', file));
                }
            }
        }
        // HLDs
        const hldFiles = await fs.readdir(archDir);
        for (const file of hldFiles) {
            if (file.startsWith('hld-') && file.endsWith('.md')) {
                livingDocs.architecture.push(path.join('.specweave/docs/internal/architecture', file));
            }
        }
    }
    // 3. Find diagrams
    const diagramsDir = path.join(process.cwd(), '.specweave/docs/internal/architecture/diagrams');
    if (await fs.pathExists(diagramsDir)) {
        const diagramFiles = await fs.readdir(diagramsDir);
        for (const file of diagramFiles) {
            if (file.endsWith('.mmd') || file.endsWith('.svg')) {
                livingDocs.diagrams.push(path.join('.specweave/docs/internal/architecture/diagrams', file));
            }
        }
    }
    return livingDocs;
}
/**
 * Load increment metadata
 */
export async function loadIncrementMetadata(incrementId) {
    const metadataPath = path.join(process.cwd(), '.specweave/increments', incrementId, 'metadata.json');
    if (!await fs.pathExists(metadataPath)) {
        return null;
    }
    return await fs.readJson(metadataPath);
}
/**
 * Detect repository owner and name from git remote
 */
export async function detectRepo() {
    try {
        const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin']);
        if (result.status !== 0) {
            return null;
        }
        const remote = result.stdout.trim();
        const match = remote.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);
        if (!match) {
            return null;
        }
        return {
            owner: match[1],
            repo: match[2]
        };
    }
    catch (error) {
        return null;
    }
}
// =============================================================================
// PRIVATE HELPERS
// =============================================================================
/**
 * Get current issue body
 */
async function getIssueBody(issueNumber, owner, repo) {
    const result = await execFileNoThrow('gh', [
        'issue',
        'view',
        String(issueNumber),
        '--repo',
        `${owner}/${repo}`,
        '--json',
        'body',
        '-q',
        '.body'
    ]);
    if (result.status !== 0) {
        throw new Error(`Failed to get issue body: ${result.stderr}`);
    }
    return result.stdout.trim();
}
/**
 * Update issue body
 */
async function updateIssueBody(issueNumber, body, owner, repo) {
    const result = await execFileNoThrow('gh', [
        'issue',
        'edit',
        String(issueNumber),
        '--repo',
        `${owner}/${repo}`,
        '--body',
        body
    ]);
    if (result.status !== 0) {
        throw new Error(`Failed to update issue body: ${result.stderr}`);
    }
}
/**
 * Post comment to issue
 */
async function postComment(issueNumber, comment, owner, repo) {
    const result = await execFileNoThrow('gh', [
        'issue',
        'comment',
        String(issueNumber),
        '--repo',
        `${owner}/${repo}`,
        '--body',
        comment
    ]);
    if (result.status !== 0) {
        throw new Error(`Failed to post comment: ${result.stderr}`);
    }
}
/**
 * Build living docs section for issue body
 */
function buildLivingDocsSection(livingDocs, owner, repo) {
    const parts = ['## 📚 Living Documentation', ''];
    // Specs
    if (livingDocs.specs.length > 0) {
        parts.push('**Specifications**:');
        livingDocs.specs.forEach(spec => {
            const name = path.basename(spec, '.md');
            const url = `https://github.com/${owner}/${repo}/blob/develop/${spec}`;
            parts.push(`- [${name}](${url})`);
        });
        parts.push('');
    }
    // Architecture
    if (livingDocs.architecture.length > 0) {
        parts.push('**Architecture**:');
        livingDocs.architecture.forEach(doc => {
            const name = path.basename(doc, '.md');
            const url = `https://github.com/${owner}/${repo}/blob/develop/${doc}`;
            parts.push(`- [${name}](${url})`);
        });
        parts.push('');
    }
    // Diagrams
    if (livingDocs.diagrams.length > 0) {
        parts.push('**Diagrams**:');
        livingDocs.diagrams.forEach(diagram => {
            const name = path.basename(diagram);
            const url = `https://github.com/${owner}/${repo}/blob/develop/${diagram}`;
            parts.push(`- [${name}](${url})`);
        });
        parts.push('');
    }
    parts.push('---');
    return parts.join('\n');
}
/**
 * Update body with living docs section
 */
function updateBodyWithLivingDocs(currentBody, livingDocsSection) {
    // Check if living docs section already exists
    const marker = '## 📚 Living Documentation';
    if (currentBody.includes(marker)) {
        // Replace existing section
        const beforeMarker = currentBody.substring(0, currentBody.indexOf(marker));
        const afterMarker = currentBody.substring(currentBody.indexOf(marker));
        // Find end of section (next ## header or end of body)
        const nextSection = afterMarker.indexOf('\n## ', 1);
        const replacement = nextSection > 0
            ? afterMarker.substring(0, nextSection)
            : afterMarker;
        return beforeMarker + livingDocsSection + (nextSection > 0 ? afterMarker.substring(nextSection) : '');
    }
    else {
        // Append at end
        return currentBody + '\n\n' + livingDocsSection;
    }
}
/**
 * Determine document type from path
 */
function getDocType(docPath) {
    if (docPath.includes('/adr/')) {
        return 'Architecture Decision Record (ADR)';
    }
    if (docPath.includes('/diagrams/')) {
        return 'Architecture Diagram';
    }
    if (docPath.startsWith('hld-')) {
        return 'High-Level Design (HLD)';
    }
    if (docPath.includes('/specs/')) {
        return 'Specification';
    }
    return 'Documentation';
}
//# sourceMappingURL=github-issue-updater.js.map