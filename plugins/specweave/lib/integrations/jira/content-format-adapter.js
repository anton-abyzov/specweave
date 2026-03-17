import { getApiVersion } from "./jira-deployment-detector.js";
function toADF(text) {
  const lines = text.split("\n");
  const content = [];
  let currentParagraph = [];
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      content.push({ type: "paragraph", content: [...currentParagraph] });
      currentParagraph = [];
    }
  };
  for (const line of lines) {
    const wikiHeadingMatch = line.match(/^h(\d)\.\s+(.+)$/);
    const mdHeadingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (wikiHeadingMatch) {
      flushParagraph();
      const level = parseInt(wikiHeadingMatch[1]);
      content.push({
        type: "heading",
        attrs: { level },
        content: [{ type: "text", text: wikiHeadingMatch[2] }]
      });
      continue;
    }
    if (mdHeadingMatch) {
      flushParagraph();
      const level = mdHeadingMatch[1].length;
      content.push({
        type: "heading",
        attrs: { level },
        content: [{ type: "text", text: mdHeadingMatch[2] }]
      });
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      flushParagraph();
      content.push({ type: "rule" });
      continue;
    }
    const bulletMatch = line.match(/^\*\s+(.+)$/) || line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const listItem = {
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: bulletMatch[1] }] }]
      };
      const lastNode = content[content.length - 1];
      if (lastNode && lastNode.type === "bulletList" && lastNode.content) {
        lastNode.content.push(listItem);
      } else {
        content.push({ type: "bulletList", content: [listItem] });
      }
      continue;
    }
    const taskMatch = line.match(/^\[( |x)\]\s+(.+)$/i);
    if (taskMatch) {
      flushParagraph();
      const isDone = taskMatch[1].toLowerCase() === "x";
      const taskItem = {
        type: "taskItem",
        attrs: {
          localId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          state: isDone ? "DONE" : "TODO"
        },
        content: [{ type: "text", text: taskMatch[2] }]
      };
      const lastNode = content[content.length - 1];
      if (lastNode && lastNode.type === "taskList" && lastNode.content) {
        lastNode.content.push(taskItem);
      } else {
        content.push({
          type: "taskList",
          attrs: { localId: `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          content: [taskItem]
        });
      }
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    let textContent = line;
    const textNodes = [];
    const parts = textContent.split(/(\*[^*]+\*|_[^_]+_)/);
    for (const part of parts) {
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        textNodes.push({
          type: "text",
          text: part.slice(1, -1),
          marks: [{ type: "strong" }]
        });
      } else if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
        textNodes.push({
          type: "text",
          text: part.slice(1, -1),
          marks: [{ type: "em" }]
        });
      } else if (part) {
        textNodes.push({ type: "text", text: part });
      }
    }
    currentParagraph.push(...textNodes);
  }
  flushParagraph();
  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: text || "" }]
    });
  }
  return {
    type: "doc",
    version: 1,
    content
  };
}
function toWikiMarkup(text) {
  return text;
}
function formatContent(text, domain) {
  const version = getApiVersion(domain);
  if (version === "3") {
    return toADF(text);
  }
  return toWikiMarkup(text);
}
function toDescription(text, domain) {
  return formatContent(text, domain);
}
function toCommentBody(text, domain) {
  return formatContent(text, domain);
}
export {
  formatContent,
  toADF,
  toCommentBody,
  toDescription,
  toWikiMarkup
};
