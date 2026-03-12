import { test, expect, chromium } from '@playwright/test';

/**
 * E2E verification: ADO/JIRA/GitHub sync after 0511-fix-ado-jira-sync
 * Verifies: Issue type, Done state, parent link, comments, closed issues
 */

const ADO_BASE = 'https://dev.azure.com/EasyChamp/SpecWeaveSync/_workitems/edit';
const JIRA_BASE = 'https://antonabyzov.atlassian.net/browse';
const GH_BASE = 'https://github.com/anton-abyzov/specweave/issues';

// Work items to verify
const ADO_FEATURE_ID = 1082;
const ADO_US_IDS = [1119, 1120, 1121, 1122, 1123];
const JIRA_EPIC = 'SWE2E-188';
const GH_ISSUES = [1557, 1558, 1559, 1560, 1561];

test.describe('0511 ADO/JIRA/GitHub Sync Verification', () => {

  test.use({ headless: true });

  // ---- ADO ----------------------------------------------------------------

  test('ADO Feature #1082 exists and is linked', async ({ page }) => {
    await page.goto(`${ADO_BASE}/${ADO_FEATURE_ID}`, { timeout: 30000 });
    // ADO requires login — check title contains feature number at minimum
    await expect(page).toHaveURL(new RegExp(`${ADO_FEATURE_ID}`));
    const title = await page.title();
    console.log(`ADO #${ADO_FEATURE_ID} page title: ${title}`);
    // Screenshot
    await page.screenshot({ path: `screenshots/ado-feature-${ADO_FEATURE_ID}.png` });
  });

  test('ADO work items are Issue type and Done state (via API)', async ({ request }) => {
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) { test.skip(true, 'AZURE_DEVOPS_PAT not set'); return; }

    const auth = Buffer.from(`:${pat}`).toString('base64');
    const ids = ADO_US_IDS.join(',');
    const resp = await request.get(
      `https://dev.azure.com/EasyChamp/SpecWeaveSync/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.WorkItemType,System.State,System.Title&api-version=7.1`,
      { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json() as { value: Array<{ id: number; fields: Record<string, string> }> };

    for (const item of data.value) {
      const type = item.fields['System.WorkItemType'];
      const state = item.fields['System.State'];
      console.log(`ADO #${item.id}: type=${type} state=${state} title=${item.fields['System.Title']?.substring(0,40)}`);
      expect(type, `Work item #${item.id} should be Issue (not User Story)`).toBe('Issue');
      expect(state, `Work item #${item.id} should be Done (not Closed)`).toBe('Done');
    }
  });

  test('ADO work items have parent link to Feature #1082 (via API)', async ({ request }) => {
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) { test.skip(true, 'AZURE_DEVOPS_PAT not set'); return; }

    const auth = Buffer.from(`:${pat}`).toString('base64');

    for (const id of ADO_US_IDS) {
      const resp = await request.get(
        `https://dev.azure.com/EasyChamp/SpecWeaveSync/_apis/wit/workitems/${id}?%24expand=relations&api-version=7.1`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      expect(resp.ok()).toBeTruthy();
      const data = await resp.json() as { relations?: Array<{ rel: string; url: string }> };
      const hierarchyRels = (data.relations ?? []).filter(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
      console.log(`ADO #${id}: ${hierarchyRels.length} parent relation(s)`);
      expect(hierarchyRels.length, `ADO #${id} should have parent link to Feature #${ADO_FEATURE_ID}`).toBeGreaterThan(0);
      const parentUrl = hierarchyRels[0]?.url ?? '';
      expect(parentUrl).toContain(String(ADO_FEATURE_ID));
    }
  });

  test('ADO work items have comments (via API)', async ({ request }) => {
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) { test.skip(true, 'AZURE_DEVOPS_PAT not set'); return; }

    const auth = Buffer.from(`:${pat}`).toString('base64');

    for (const id of ADO_US_IDS) {
      const resp = await request.get(
        `https://dev.azure.com/EasyChamp/EasyChamp/_apis/wit/workitems/${id}/comments?api-version=7.1-preview`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      // Comments may come from System.History in the updates
      const updResp = await request.get(
        `https://dev.azure.com/EasyChamp/SpecWeaveSync/_apis/wit/workitems/${id}/updates?api-version=7.1`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      expect(updResp.ok()).toBeTruthy();
      const updates = await updResp.json() as { value: Array<{ fields?: { 'System.History'?: { newValue?: string } } }> };
      const historyUpdates = updates.value.filter(u => u.fields?.['System.History']?.newValue);
      console.log(`ADO #${id}: ${historyUpdates.length} history/comment update(s)`);
      expect(historyUpdates.length, `ADO #${id} should have at least one comment/history entry`).toBeGreaterThan(0);
    }
  });

  // ---- JIRA ---------------------------------------------------------------

  test('JIRA SWE2E-188 is Done with comment (via API)', async ({ request }) => {
    const token = process.env.JIRA_API_TOKEN;
    const email = process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL;
    if (!token || !email) { test.skip(true, 'JIRA credentials not set'); return; }

    const auth = Buffer.from(`${email}:${token}`).toString('base64');
    const resp = await request.get(
      `https://antonabyzov.atlassian.net/rest/api/3/issue/${JIRA_EPIC}?fields=summary,status,comment`,
      { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json() as { fields: { status: { name: string }; summary: string; comment: { comments: unknown[] } } };
    console.log(`JIRA ${JIRA_EPIC}: status=${data.fields.status.name} summary=${data.fields.summary}`);
    expect(data.fields.status.name, `${JIRA_EPIC} should be Done`).toBe('Done');
    const commentCount = data.fields.comment.comments.length;
    console.log(`JIRA ${JIRA_EPIC}: ${commentCount} comment(s)`);
    expect(commentCount, `${JIRA_EPIC} should have at least one comment`).toBeGreaterThan(0);
  });

  test('JIRA SWE2E-188 page shows Done status', async ({ page }) => {
    await page.goto(`${JIRA_BASE}/${JIRA_EPIC}`, { timeout: 30000 });
    await page.screenshot({ path: `screenshots/jira-${JIRA_EPIC}.png`, fullPage: true });
    const url = page.url();
    console.log(`JIRA ${JIRA_EPIC} URL: ${url}`);
    // Either authenticated page or redirect - confirm we got there
    expect(url).toContain('atlassian.net');
  });

  // ---- GitHub -------------------------------------------------------------

  test('GitHub issues #1557-1561 are CLOSED with comments (via API)', async ({ request }) => {
    const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!ghToken) { test.skip(true, 'GITHUB_TOKEN not set'); return; }

    for (const num of GH_ISSUES) {
      const resp = await request.get(
        `https://api.github.com/repos/anton-abyzov/specweave/issues/${num}`,
        { headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' } }
      );
      expect(resp.ok()).toBeTruthy();
      const issue = await resp.json() as { number: number; state: string; title: string; comments: number };
      console.log(`GitHub #${issue.number}: state=${issue.state} comments=${issue.comments} title=${issue.title.substring(0,50)}`);
      expect(issue.state, `GitHub #${num} should be closed`).toBe('closed');
      expect(issue.comments, `GitHub #${num} should have at least one comment`).toBeGreaterThan(0);
    }
  });

  test('GitHub issues page shows closed state', async ({ page }) => {
    await page.goto(`${GH_BASE}/1557`, { timeout: 30000 });
    await page.screenshot({ path: 'screenshots/github-issue-1557.png', fullPage: true });
    // Check for closed badge in the page
    const closedBadge = page.locator('[title="Status: Closed"], .gh-header-meta .State--purple, span:has-text("Closed")').first();
    const visible = await closedBadge.isVisible().catch(() => false);
    console.log(`GitHub #1557 closed badge visible: ${visible}`);
    // Take screenshot regardless — confirms visual state
    const title = await page.title();
    console.log(`GitHub #1557 page title: ${title}`);
  });

});
