const fs = require('fs');
const path = require('path');

const tasksPath = path.join(__dirname, '..', 'tasks.md');
const content = fs.readFileSync(tasksPath, 'utf-8');

// Extract all tasks with their completion status and AC linkage
const lines = content.split('\n');
const completedACs = new Set();
let completedCount = 0;
let totalCount = 0;
let currentTask = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Task header
  if (line.match(/^### T-\d+:/)) {
    currentTask = { id: line.match(/T-\d+/)[0], acs: [], complete: false };
    totalCount++;
  }

  // AC linkage
  if (line.startsWith('**Satisfies ACs**:') && currentTask) {
    const acsLine = line.replace('**Satisfies ACs**:', '').trim();
    currentTask.acs = acsLine.split(',').map(ac => ac.trim());
  }

  // Status
  if (line.match(/^\*\*Status\*\*: \[(x| )\]/) && currentTask) {
    const isComplete = line.includes('[x]');
    currentTask.complete = isComplete;

    if (isComplete) {
      completedCount++;
      currentTask.acs.forEach(ac => completedACs.add(ac));
    }
    currentTask = null;
  }
}

console.log(`Total tasks: ${totalCount}`);
console.log(`Completed tasks: ${completedCount}`);
console.log(`\nSatisfied ACs (${completedACs.size}):`);
Array.from(completedACs).sort().forEach(ac => console.log(`  - ${ac}`));
