#!/usr/bin/env tsx

const content = `---
increment: 0040-test
title: "Test Feature"
---

# Test Feature

### US-001: First Story

**As a** user
**I want** to test
**So that** it works

- [ ] AC-US1-01: First criterion
`;

console.log('Full content length:', content.length);
console.log('Content (escaped):', JSON.stringify(content).slice(0, 300));
console.log('---');

// Extract user stories - try simple pattern first
const simplePattern = /###\s+(US-\d+):\s+(.+)/g;
console.log('Simple pattern matches:');
let simpleMatch;
while ((simpleMatch = simplePattern.exec(content)) !== null) {
  console.log('  Found:', simpleMatch[1], '-', simpleMatch[2]);
}

console.log('---');

// Extract user stories
// Split content into sections manually
const lines = content.split('\n');
const stories = [];

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^###+\s+(US-\d+):\s+(.+)/);
  if (match) {
    const id = match[1];
    const title = match[2];

    // Collect all lines until next US heading or end
    const storyLines = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].match(/^###+\s+US-\d+:/)) {
        break; // Found next US heading
      }
      storyLines.push(lines[j]);
    }

    const storyContent = storyLines.join('\n');
    console.log('Parsed story:', id);
    console.log('Content length:', storyContent.length);
    console.log('Content:', JSON.stringify(storyContent).slice(0, 200));

    stories.push({ id, title, content: storyContent });
  }
}

console.log('---');
console.log('Stories found:', stories.length);

// Try regex pattern
const storyPattern = /^###+\s+(US-\d+):\s+(.+?)\s*\n([\s\S]+?)(?=^###+\s+US-)/gm;

let match;
while ((match = storyPattern.exec(content)) !== null) {
  const id = match[1];
  const title = match[2];
  const storyContent = match[3];

  console.log('ID:', id);
  console.log('Title:', title);
  console.log('Story Content:', JSON.stringify(storyContent));
  console.log('---');

  // Try to extract description
  const descMatch = storyContent.match(/\*\*As a\*\*\s*([^\n]+)\s*\n\*\*I want\*\*\s*([^\n]+)\s*\n\*\*So that\*\*\s*([^\n]+)/i);
  if (descMatch) {
    console.log('Description Match:', descMatch);
    console.log('As a:', descMatch[1]);
    console.log('I want:', descMatch[2]);
    console.log('So that:', descMatch[3]);
  } else {
    console.log('NO DESCRIPTION MATCH');
  }
}
