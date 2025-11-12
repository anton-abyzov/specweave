import inquirer from "inquirer";
import { GitHubClient } from "./github-client.js";
async function fetchAllGitHubRepos(owner, limit = 100) {
  console.log("\u{1F50D} Fetching GitHub repositories...");
  try {
    const repos = await GitHubClient.getRepositories(owner, limit);
    console.log(`\u2705 Found ${repos.length} GitHub repositories
`);
    return repos;
  } catch (error) {
    console.error("\u274C Failed to fetch GitHub repositories:", error.message);
    throw error;
  }
}
async function selectGitHubRepos(options = {}) {
  const {
    allowManualEntry = true,
    allowSelectAll = true,
    preSelected = [],
    minSelection = 1,
    maxSelection,
    pageSize = 15,
    owner,
    limit = 100
  } = options;
  const allRepos = await fetchAllGitHubRepos(owner, limit);
  if (allRepos.length === 0) {
    console.log("\u26A0\uFE0F  No GitHub repositories found");
    return {
      selectedRepos: [],
      method: "interactive"
    };
  }
  console.log("\u{1F4CB} Available GitHub Repositories:\n");
  console.log(`   Total: ${allRepos.length} repositories
`);
  const { selectionMethod } = await inquirer.prompt([
    {
      type: "list",
      name: "selectionMethod",
      message: "How would you like to select repositories?",
      choices: [
        {
          name: `\u{1F4CB} Interactive (browse and select from ${allRepos.length} repositories)`,
          value: "interactive"
        },
        {
          name: "\u270F\uFE0F  Manual entry (type repository names)",
          value: "manual"
        },
        ...allowSelectAll ? [
          {
            name: `\u2728 Select all (${allRepos.length} repositories)`,
            value: "all"
          }
        ] : []
      ]
    }
  ]);
  if (selectionMethod === "all") {
    return {
      selectedRepos: allRepos.map((r) => r.fullName),
      method: "all"
    };
  }
  if (selectionMethod === "manual") {
    return await manualRepoEntry(allRepos, minSelection, maxSelection);
  }
  return await interactiveRepoSelection(
    allRepos,
    preSelected,
    minSelection,
    maxSelection,
    pageSize
  );
}
async function interactiveRepoSelection(allRepos, preSelected, minSelection, maxSelection, pageSize) {
  console.log("\u{1F4A1} Use <space> to select, <a> to toggle all, <i> to invert\n");
  const choices = allRepos.map((r) => ({
    name: formatRepoChoice(r),
    value: r.fullName,
    checked: preSelected.includes(r.fullName)
  }));
  choices.push(
    new inquirer.Separator(),
    {
      name: "\u270F\uFE0F  Enter repository names manually instead",
      value: "__MANUAL__",
      checked: false
    }
  );
  const { selectedRepos } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedRepos",
      message: `Select GitHub repositories (${minSelection}${maxSelection ? `-${maxSelection}` : "+"} required):`,
      choices,
      pageSize,
      loop: false,
      validate: (selected) => {
        const actualSelected = selected.filter((k) => k !== "__MANUAL__");
        if (actualSelected.length < minSelection) {
          return `Please select at least ${minSelection} repository(ies)`;
        }
        if (maxSelection && actualSelected.length > maxSelection) {
          return `Please select at most ${maxSelection} repository(ies)`;
        }
        return true;
      }
    }
  ]);
  if (selectedRepos.includes("__MANUAL__")) {
    return await manualRepoEntry(allRepos, minSelection, maxSelection);
  }
  console.log(`
\u2705 Selected ${selectedRepos.length} repositories: ${selectedRepos.join(", ")}
`);
  return {
    selectedRepos,
    method: "interactive"
  };
}
async function manualRepoEntry(allRepos, minSelection, maxSelection) {
  console.log("\n\u{1F4DD} Enter repository names manually\n");
  console.log("\u{1F4A1} Format: Comma-separated owner/repo format (e.g., octocat/Hello-World,owner/repo2)\n");
  if (allRepos.length > 0) {
    console.log("Available repositories:");
    console.log(
      allRepos.map((r) => r.fullName).join(", ").substring(0, 100) + (allRepos.length > 20 ? "..." : "")
    );
    console.log("");
  }
  const { manualRepos } = await inquirer.prompt([
    {
      type: "input",
      name: "manualRepos",
      message: "Repository names:",
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter at least one repository name";
        }
        const repos = input.split(",").map((r) => r.trim()).filter((r) => r.length > 0);
        if (repos.length < minSelection) {
          return `Please enter at least ${minSelection} repository name(s)`;
        }
        if (maxSelection && repos.length > maxSelection) {
          return `Please enter at most ${maxSelection} repository name(s)`;
        }
        const invalidRepos = repos.filter((r) => !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(r));
        if (invalidRepos.length > 0) {
          return `Invalid repository format: ${invalidRepos.join(", ")}. Use owner/repo format (e.g., octocat/Hello-World).`;
        }
        return true;
      }
    }
  ]);
  const selectedRepos = manualRepos.split(",").map((r) => r.trim()).filter((r) => r.length > 0);
  const knownRepos = allRepos.map((r) => r.fullName);
  const unknownRepos = selectedRepos.filter((r) => !knownRepos.includes(r));
  if (unknownRepos.length > 0) {
    console.log(`
\u26A0\uFE0F  Unknown repository names (will be used anyway): ${unknownRepos.join(", ")}`);
    console.log("   Make sure these repositories exist and you have access to them.\n");
  }
  console.log(`\u2705 Selected ${selectedRepos.length} repositories: ${selectedRepos.join(", ")}
`);
  return {
    selectedRepos,
    method: "manual"
  };
}
function formatRepoChoice(repo) {
  return `${repo.fullName.padEnd(40)} (${repo.owner})`;
}
async function selectSingleGitHubRepo(message = "Select GitHub repository:", owner) {
  const result = await selectGitHubRepos({
    allowManualEntry: true,
    allowSelectAll: false,
    minSelection: 1,
    maxSelection: 1,
    owner
  });
  return result.selectedRepos[0];
}
export {
  fetchAllGitHubRepos,
  selectGitHubRepos,
  selectSingleGitHubRepo
};
