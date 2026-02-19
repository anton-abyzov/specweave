import { describe, it, expect } from "vitest";
import {
  stripSwSections,
  mergeInstructionFile,
} from "../../../src/cli/helpers/init/instruction-file-merger.js";

// ---------------------------------------------------------------------------
// stripSwSections
// ---------------------------------------------------------------------------

describe("stripSwSections", () => {
  it("returns null for a file that is 100% SW-managed", () => {
    const content = `<!-- SW:META template="claude" version="1.0.272" sections="header,rules" -->

<!-- SW:SECTION:header version="1.0.272" -->
**Framework**: SpecWeave
<!-- SW:END:header -->

<!-- SW:SECTION:rules version="1.0.272" -->
## Rules
1. Follow the spec
<!-- SW:END:rules -->
`;
    expect(stripSwSections(content)).toBeNull();
  });

  it("returns user content when mixed with SW sections", () => {
    const content = `<!-- SW:META template="claude" version="1.0.272" sections="header,rules" -->

<!-- SW:SECTION:header version="1.0.272" -->
**Framework**: SpecWeave
<!-- SW:END:header -->

## My Custom Section

This is user content that should be preserved.

<!-- SW:SECTION:rules version="1.0.272" -->
## Rules
1. Follow the spec
<!-- SW:END:rules -->

## Another Custom Section

More user content here.
`;
    const result = stripSwSections(content);
    expect(result).not.toBeNull();
    expect(result).toContain("My Custom Section");
    expect(result).toContain("This is user content that should be preserved.");
    expect(result).toContain("Another Custom Section");
    expect(result).toContain("More user content here.");
    expect(result).not.toContain("SW:SECTION");
    expect(result).not.toContain("SW:END");
    expect(result).not.toContain("SW:META");
    expect(result).not.toContain("**Framework**: SpecWeave");
  });

  it("returns null for empty string", () => {
    expect(stripSwSections("")).toBeNull();
  });

  it("returns the full content for a file with no SW markers (pure user content)", () => {
    const content = `## My Project Notes

Some custom instructions here.

## More Notes

Additional content.
`;
    const result = stripSwSections(content);
    expect(result).not.toBeNull();
    expect(result).toContain("My Project Notes");
    expect(result).toContain("Some custom instructions here.");
  });

  it("handles legacy files without SW:META marker", () => {
    const content = `# Old CLAUDE.md

This file has no SpecWeave markers at all.
Just plain user content.
`;
    const result = stripSwSections(content);
    expect(result).not.toBeNull();
    expect(result).toContain("Old CLAUDE.md");
  });
});
