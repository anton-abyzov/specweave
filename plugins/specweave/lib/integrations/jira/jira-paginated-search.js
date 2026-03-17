const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1e3;
async function searchAllIssues(client, options) {
  const { jql, fields, maxResults = DEFAULT_PAGE_SIZE } = options;
  const allIssues = [];
  let nextPageToken;
  do {
    const body = {
      jql,
      maxResults
    };
    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }
    if (fields) {
      body.fields = fields.split(",").map((f) => f.trim());
    }
    const response = await requestWithRetry(client, "/search/jql", body);
    const data = response.data;
    const issues = data.issues || [];
    allIssues.push(...issues);
    nextPageToken = data.nextPageToken;
    if (issues.length === 0) break;
  } while (nextPageToken);
  return allIssues;
}
async function requestWithRetry(client, url, body, attempt = 0) {
  try {
    return await client.post(url, body);
  } catch (error) {
    const axiosError = error;
    const status = axiosError.response?.status;
    if (status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = axiosError.response?.headers?.["retry-after"];
      const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1e3 : BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${retryAfterMs}ms...`
      );
      await sleep(retryAfterMs);
      return requestWithRetry(client, url, body, attempt + 1);
    }
    if (status === 429) {
      throw new Error(
        `JIRA rate limit exceeded after ${MAX_RETRIES} retries. Try again later or reduce request frequency.`
      );
    }
    throw error;
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export {
  searchAllIssues
};
