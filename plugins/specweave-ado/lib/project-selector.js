import inquirer from "inquirer";
async function fetchAllAdoProjects(client) {
  console.log("\u{1F50D} Fetching Azure DevOps projects...");
  try {
    const projects = await client.getProjects();
    console.log(`\u2705 Found ${projects.length} Azure DevOps projects
`);
    return projects;
  } catch (error) {
    console.error("\u274C Failed to fetch ADO projects:", error.message);
    throw error;
  }
}
async function selectAdoProjects(client, options = {}) {
  const {
    allowManualEntry = true,
    allowSelectAll = true,
    preSelected = [],
    minSelection = 1,
    maxSelection,
    pageSize = 15
  } = options;
  const allProjects = await fetchAllAdoProjects(client);
  if (allProjects.length === 0) {
    console.log("\u26A0\uFE0F  No Azure DevOps projects found");
    return {
      selectedNames: [],
      method: "interactive"
    };
  }
  console.log("\u{1F4CB} Available Azure DevOps Projects:\n");
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
          name: "\u270F\uFE0F  Manual entry (type project names)",
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
      selectedNames: allProjects.map((p) => p.name),
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
    value: p.name,
    checked: preSelected.includes(p.name)
  }));
  choices.push(
    new inquirer.Separator(),
    {
      name: "\u270F\uFE0F  Enter project names manually instead",
      value: "__MANUAL__",
      checked: false
    }
  );
  const { selectedNames } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedNames",
      message: `Select Azure DevOps projects (${minSelection}${maxSelection ? `-${maxSelection}` : "+"} required):`,
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
  if (selectedNames.includes("__MANUAL__")) {
    return await manualProjectEntry(allProjects, minSelection, maxSelection);
  }
  console.log(`
\u2705 Selected ${selectedNames.length} projects: ${selectedNames.join(", ")}
`);
  return {
    selectedNames,
    method: "interactive"
  };
}
async function manualProjectEntry(allProjects, minSelection, maxSelection) {
  console.log("\n\u{1F4DD} Enter project names manually\n");
  console.log("\u{1F4A1} Format: Comma-separated project names (e.g., AI Meme Generator,Project 2,Project 3)\n");
  if (allProjects.length > 0) {
    console.log("Available project names:");
    console.log(
      allProjects.map((p) => p.name).join(", ").substring(0, 100) + (allProjects.length > 20 ? "..." : "")
    );
    console.log("");
  }
  const { manualNames } = await inquirer.prompt([
    {
      type: "input",
      name: "manualNames",
      message: "Project names:",
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter at least one project name";
        }
        const names = input.split(",").map((n) => n.trim()).filter((n) => n.length > 0);
        if (names.length < minSelection) {
          return `Please enter at least ${minSelection} project name(s)`;
        }
        if (maxSelection && names.length > maxSelection) {
          return `Please enter at most ${maxSelection} project name(s)`;
        }
        return true;
      }
    }
  ]);
  const selectedNames = manualNames.split(",").map((n) => n.trim()).filter((n) => n.length > 0);
  const knownNames = allProjects.map((p) => p.name);
  const unknownNames = selectedNames.filter((n) => !knownNames.includes(n));
  if (unknownNames.length > 0) {
    console.log(`
\u26A0\uFE0F  Unknown project names (will be used anyway): ${unknownNames.join(", ")}`);
    console.log("   Make sure these projects exist in your Azure DevOps organization.\n");
  }
  console.log(`\u2705 Selected ${selectedNames.length} projects: ${selectedNames.join(", ")}
`);
  return {
    selectedNames,
    method: "manual"
  };
}
function formatProjectChoice(project) {
  const visibility = project.visibility || "private";
  const state = project.state || "wellFormed";
  return `${project.name.padEnd(30)} - ${project.description || "No description"} (${visibility}, ${state})`;
}
async function selectSingleAdoProject(client, message = "Select Azure DevOps project:") {
  const result = await selectAdoProjects(client, {
    allowManualEntry: true,
    allowSelectAll: false,
    minSelection: 1,
    maxSelection: 1
  });
  return result.selectedNames[0];
}
export {
  fetchAllAdoProjects,
  selectAdoProjects,
  selectSingleAdoProject
};
