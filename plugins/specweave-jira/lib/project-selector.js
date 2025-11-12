import inquirer from "inquirer";
async function fetchAllJiraProjects(client) {
  console.log("\u{1F50D} Fetching Jira projects...");
  try {
    const projects = await client.getProjects();
    console.log(`\u2705 Found ${projects.length} Jira projects
`);
    return projects;
  } catch (error) {
    console.error("\u274C Failed to fetch Jira projects:", error.message);
    throw error;
  }
}
async function selectJiraProjects(client, options = {}) {
  const {
    allowManualEntry = true,
    allowSelectAll = true,
    preSelected = [],
    minSelection = 1,
    maxSelection,
    pageSize = 15
  } = options;
  const allProjects = await fetchAllJiraProjects(client);
  if (allProjects.length === 0) {
    console.log("\u26A0\uFE0F  No Jira projects found");
    return {
      selectedKeys: [],
      method: "interactive"
    };
  }
  console.log("\u{1F4CB} Available Jira Projects:\n");
  console.log(`   Total: ${allProjects.length} projects
`);
  const { selectionMethod } = await inquirer.prompt([
    {
      type: "list",
      name: "selectionMethod",
      message: "How would you like to select projects?",
      choices: [
        {
          name: `\u{1F4CB} Interactive (browse and select from ${allProjects.length} projects)`,
          value: "interactive"
        },
        {
          name: "\u270F\uFE0F  Manual entry (type project keys)",
          value: "manual"
        },
        ...allowSelectAll ? [
          {
            name: `\u2728 Select all (${allProjects.length} projects)`,
            value: "all"
          }
        ] : []
      ]
    }
  ]);
  if (selectionMethod === "all") {
    return {
      selectedKeys: allProjects.map((p) => p.key),
      method: "all"
    };
  }
  if (selectionMethod === "manual") {
    return await manualProjectEntry(allProjects, minSelection, maxSelection);
  }
  return await interactiveProjectSelection(
    allProjects,
    preSelected,
    minSelection,
    maxSelection,
    pageSize
  );
}
async function interactiveProjectSelection(allProjects, preSelected, minSelection, maxSelection, pageSize) {
  console.log("\u{1F4A1} Use <space> to select, <a> to toggle all, <i> to invert\n");
  const choices = allProjects.map((p) => ({
    name: formatProjectChoice(p),
    value: p.key,
    checked: preSelected.includes(p.key)
  }));
  choices.push(
    new inquirer.Separator(),
    {
      name: "\u270F\uFE0F  Enter project keys manually instead",
      value: "__MANUAL__",
      checked: false
    }
  );
  const { selectedKeys } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedKeys",
      message: `Select Jira projects (${minSelection}${maxSelection ? `-${maxSelection}` : "+"} required):`,
      choices,
      pageSize,
      loop: false,
      validate: (selected) => {
        const actualSelected = selected.filter((k) => k !== "__MANUAL__");
        if (actualSelected.length < minSelection) {
          return `Please select at least ${minSelection} project(s)`;
        }
        if (maxSelection && actualSelected.length > maxSelection) {
          return `Please select at most ${maxSelection} project(s)`;
        }
        return true;
      }
    }
  ]);
  if (selectedKeys.includes("__MANUAL__")) {
    return await manualProjectEntry(allProjects, minSelection, maxSelection);
  }
  console.log(`
\u2705 Selected ${selectedKeys.length} projects: ${selectedKeys.join(", ")}
`);
  return {
    selectedKeys,
    method: "interactive"
  };
}
async function manualProjectEntry(allProjects, minSelection, maxSelection) {
  console.log("\n\u{1F4DD} Enter project keys manually\n");
  console.log("\u{1F4A1} Format: Comma-separated project keys (e.g., SCRUM,PROD,MOBILE)\n");
  if (allProjects.length > 0) {
    console.log("Available project keys:");
    console.log(
      allProjects.map((p) => p.key).join(", ").substring(0, 100) + (allProjects.length > 20 ? "..." : "")
    );
    console.log("");
  }
  const { manualKeys } = await inquirer.prompt([
    {
      type: "input",
      name: "manualKeys",
      message: "Project keys:",
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter at least one project key";
        }
        const keys = input.split(",").map((k) => k.trim().toUpperCase()).filter((k) => k.length > 0);
        if (keys.length < minSelection) {
          return `Please enter at least ${minSelection} project key(s)`;
        }
        if (maxSelection && keys.length > maxSelection) {
          return `Please enter at most ${maxSelection} project key(s)`;
        }
        const invalidKeys = keys.filter((k) => !/^[A-Z0-9]+$/.test(k));
        if (invalidKeys.length > 0) {
          return `Invalid project key format: ${invalidKeys.join(", ")}. Use uppercase letters/numbers only.`;
        }
        return true;
      }
    }
  ]);
  const selectedKeys = manualKeys.split(",").map((k) => k.trim().toUpperCase()).filter((k) => k.length > 0);
  const knownKeys = allProjects.map((p) => p.key);
  const unknownKeys = selectedKeys.filter((k) => !knownKeys.includes(k));
  if (unknownKeys.length > 0) {
    console.log(`
\u26A0\uFE0F  Unknown project keys (will be used anyway): ${unknownKeys.join(", ")}`);
    console.log("   Make sure these projects exist in your Jira instance.\n");
  }
  console.log(`\u2705 Selected ${selectedKeys.length} projects: ${selectedKeys.join(", ")}
`);
  return {
    selectedKeys,
    method: "manual"
  };
}
function formatProjectChoice(project) {
  const type = project.projectTypeKey || "unknown";
  const lead = project.lead?.displayName || "No lead";
  return `${project.key.padEnd(10)} - ${project.name} (${type}, lead: ${lead})`;
}
async function selectSingleJiraProject(client, message = "Select Jira project:") {
  const result = await selectJiraProjects(client, {
    allowManualEntry: true,
    allowSelectAll: false,
    minSelection: 1,
    maxSelection: 1
  });
  return result.selectedKeys[0];
}
export {
  fetchAllJiraProjects,
  selectJiraProjects,
  selectSingleJiraProject
};
