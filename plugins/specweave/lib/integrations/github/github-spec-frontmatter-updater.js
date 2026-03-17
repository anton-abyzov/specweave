import { readFile, writeFile } from "fs/promises";
async function updateSpecFrontmatter(specPath, syncResult, options) {
  const content = await readFile(specPath, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter = {};
  let body = content;
  if (fmMatch) {
    frontmatter = parseYamlSimple(fmMatch[1]);
    body = content.slice(fmMatch[0].length);
  }
  const externalLinks = frontmatter.externalLinks ?? {};
  const existingGithub = externalLinks.github ?? {};
  const existingUserStories = existingGithub.userStories ?? {};
  const userStories = { ...existingUserStories };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of syncResult.created) {
    userStories[item.userStoryId] = {
      issueNumber: item.issueNumber,
      issueUrl: item.issueUrl,
      issueNodeId: item.issueNodeId,
      syncedAt: now
    };
  }
  for (const item of syncResult.updated) {
    const existing = userStories[item.userStoryId];
    userStories[item.userStoryId] = {
      issueNumber: item.issueNumber,
      issueUrl: item.issueUrl,
      issueNodeId: existing?.issueNodeId,
      syncedAt: now
    };
  }
  const syncStatus = syncResult.errors.length > 0 ? "dirty" : "synced";
  const metadata = {
    syncStatus,
    userStories
  };
  if (options?.projectV2Id) {
    metadata.projectV2Id = options.projectV2Id;
  } else if (existingGithub.projectV2Id) {
    metadata.projectV2Id = existingGithub.projectV2Id;
  }
  if (options?.projectV2Number) {
    metadata.projectV2Number = options.projectV2Number;
  } else if (existingGithub.projectV2Number) {
    metadata.projectV2Number = existingGithub.projectV2Number;
  }
  externalLinks.github = metadata;
  frontmatter.externalLinks = externalLinks;
  const newFrontmatter = stringifyYaml(frontmatter);
  const newContent = `---
${newFrontmatter}
---${body}`;
  await writeFile(specPath, newContent, "utf-8");
  return metadata;
}
function parseYamlSimple(yaml) {
  const result = {};
  const lines = yaml.split("\n");
  const stack = [
    { obj: result, indent: -1 }
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent2 = stack[stack.length - 1];
      const key2 = parent2.currentKey;
      if (key2 && parent2.obj[key2] !== void 0) {
        const arr = parent2.obj[key2];
        if (Array.isArray(arr)) {
          const itemText = trimmed.slice(2).trim();
          const nestedColonIdx = itemText.indexOf(":");
          if (nestedColonIdx > 0 && !itemText.startsWith('"') && !itemText.startsWith("'")) {
            const nestedKey = itemText.slice(0, nestedColonIdx).trim();
            const nestedVal = itemText.slice(nestedColonIdx + 1).trim();
            if (nestedVal) {
              const obj = { [nestedKey]: parseYamlValue(nestedVal) };
              arr.push(obj);
            } else {
              arr.push(parseYamlValue(itemText));
            }
          } else {
            arr.push(parseYamlValue(itemText));
          }
        }
      }
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;
    if (rawValue === "" || rawValue === void 0) {
      const nextIdx = findNextNonEmptyLine(lines, i + 1);
      if (nextIdx !== -1 && lines[nextIdx].trim().startsWith("- ")) {
        parent[key] = [];
        stack.push({ obj: parent, indent, currentKey: key });
      } else {
        const child = {};
        parent[key] = child;
        stack.push({ obj: child, indent });
      }
    } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      parent[key] = parseFlowArray(rawValue);
    } else {
      parent[key] = parseYamlValue(rawValue);
    }
  }
  return result;
}
function findNextNonEmptyLine(lines, start) {
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith("#")) return i;
  }
  return -1;
}
function parseFlowArray(raw) {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  const items = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(parseYamlValue(current.trim()));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    items.push(parseYamlValue(current.trim()));
  }
  return items;
}
function parseYamlValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  if (raw.startsWith('"') && raw.endsWith('"') || raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }
  return raw;
}
function stringifyYaml(obj, indent = 0) {
  const prefix = "  ".repeat(indent);
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === void 0) {
      parts.push(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        parts.push(`${prefix}${key}: []`);
      } else if (value.every((v) => typeof v !== "object" || v === null)) {
        parts.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === "string") {
            parts.push(`${prefix}  - "${item}"`);
          } else {
            parts.push(`${prefix}  - ${item}`);
          }
        }
      } else {
        parts.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const entries = Object.entries(item);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              const formattedVal = typeof firstVal === "string" ? `"${firstVal}"` : firstVal;
              parts.push(`${prefix}  - ${firstKey}: ${formattedVal}`);
              for (let j = 1; j < entries.length; j++) {
                const [k, v] = entries[j];
                const fv = typeof v === "string" ? `"${v}"` : v;
                parts.push(`${prefix}    ${k}: ${fv}`);
              }
            }
          } else {
            parts.push(`${prefix}  - ${item}`);
          }
        }
      }
    } else if (typeof value === "object") {
      parts.push(`${prefix}${key}:`);
      parts.push(stringifyYaml(value, indent + 1));
    } else if (typeof value === "string") {
      parts.push(`${prefix}${key}: "${value}"`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      parts.push(`${prefix}${key}: ${value}`);
    } else {
      parts.push(`${prefix}${key}: ${JSON.stringify(value)}`);
    }
  }
  return parts.join("\n");
}
export {
  updateSpecFrontmatter
};
