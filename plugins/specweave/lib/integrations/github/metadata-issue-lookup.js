import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
async function getIssueNumberFromMetadata(incrementsDir, featureId, userStoryId) {
  try {
    if (!existsSync(incrementsDir)) return null;
    const numMatch = featureId.match(/FS-0*(\d+)E?/i);
    if (!numMatch) return null;
    const paddedNum = String(parseInt(numMatch[1], 10)).padStart(4, "0");
    const entries = await readdir(incrementsDir);
    const match = entries.find((e) => e.startsWith(paddedNum + "-"));
    if (!match) return null;
    const metadataPath = path.join(incrementsDir, match, "metadata.json");
    if (!existsSync(metadataPath)) return null;
    const raw = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(raw);
    const newFormat = metadata?.externalLinks?.github?.issues?.[userStoryId];
    if (newFormat?.issueNumber) {
      return newFormat.issueNumber;
    }
    const oldFormat = metadata?.github?.issues;
    if (Array.isArray(oldFormat)) {
      const entry = oldFormat.find(
        (i) => i.userStory === userStoryId
      );
      if (entry?.number) return entry.number;
    }
    return null;
  } catch {
    return null;
  }
}
export {
  getIssueNumberFromMetadata
};
