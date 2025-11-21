#!/bin/bash
#
# Pre-Commit YAML Validation
# Validates YAML frontmatter in spec.md files
#
# Prevents:
# - Malformed YAML syntax (unclosed brackets, quotes, invalid keys)
# - Missing required fields (increment)
# - Invalid field values (incorrect increment ID format)
#
# Part of: Multi-layered YAML validation strategy
# Related: CLAUDE.md Rule #16 - "YAML Frontmatter Validation"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get staged spec.md files
staged_specs=$(git diff --cached --name-only --diff-filter=ACM | grep 'spec\.md$' || true)

if [ -z "$staged_specs" ]; then
  # No spec.md files staged, nothing to validate
  exit 0
fi

echo ""
echo "🔍 Validating YAML frontmatter in spec.md files..."
echo ""

VALIDATION_FAILED=0
VALIDATED_COUNT=0
FAILED_FILES=()

for spec_file in $staged_specs; do
  # Skip if file doesn't exist (deleted)
  if [ ! -f "$spec_file" ]; then
    continue
  fi

  # Use Node.js to parse YAML (more robust than bash parsing)
  validation_result=$(node -e "
    const fs = require('fs');
    const yaml = require('js-yaml');

    try {
      const content = fs.readFileSync('$spec_file', 'utf-8');
      const lines = content.split('\n');

      // Extract frontmatter
      let inFrontmatter = false;
      let frontmatterLines = [];
      let frontmatterStart = -1;
      let frontmatterEnd = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '---') {
          if (!inFrontmatter) {
            inFrontmatter = true;
            frontmatterStart = i + 1;
            continue;
          } else {
            frontmatterEnd = i + 1;
            break;  // End of frontmatter
          }
        }
        if (inFrontmatter) {
          frontmatterLines.push(line);
        }
      }

      // Check if frontmatter exists
      if (frontmatterLines.length === 0) {
        console.log('ERROR: No YAML frontmatter found');
        console.log('HINT: Spec.md must start with:');
        console.log('---');
        console.log('increment: 0001-feature-name');
        console.log('---');
        process.exit(1);
      }

      // Parse YAML frontmatter
      let frontmatter;
      try {
        frontmatter = yaml.load(frontmatterLines.join('\n'));
      } catch (yamlError) {
        console.log('ERROR: Malformed YAML syntax in frontmatter');
        console.log('DETAILS: ' + yamlError.message);
        console.log('LOCATION: Lines ' + frontmatterStart + '-' + frontmatterEnd);
        console.log('HINT: Common mistakes:');
        console.log('  - Unclosed brackets: [unclosed');
        console.log('  - Unclosed quotes: \"unclosed');
        console.log('  - Invalid YAML object: {key: value, broken');
        process.exit(1);
      }

      // Validate frontmatter is an object
      if (!frontmatter || typeof frontmatter !== 'object') {
        console.log('ERROR: YAML frontmatter must be an object with key-value pairs');
        process.exit(1);
      }

      // Validate required field: increment
      if (!frontmatter.increment) {
        console.log('ERROR: Missing required field: increment');
        console.log('HINT: Add to frontmatter:');
        console.log('increment: 0001-feature-name');
        process.exit(1);
      }

      // Validate increment ID format (0001-feature-name)
      const incrementIdRegex = /^[0-9]{4}-[a-z0-9-]+$/;
      if (!incrementIdRegex.test(frontmatter.increment)) {
        console.log('ERROR: Invalid increment ID format: \"' + frontmatter.increment + '\"');
        console.log('EXPECTED: 4-digit number + hyphen + kebab-case name');
        console.log('EXAMPLE: 0001-feature-name, 0042-bug-fix, 0099-refactor');
        console.log('INVALID: 1-test (missing leading zeros), 0001_test (underscore), 0001-Test (uppercase)');
        process.exit(1);
      }

      // Success
      console.log('OK');
      process.exit(0);

    } catch (error) {
      console.log('ERROR: ' + error.message);
      process.exit(1);
    }
  " 2>&1)

  # Check validation result
  if echo "$validation_result" | grep -q "^ERROR:"; then
    echo -e "${RED}❌ $spec_file${NC}"
    echo "$validation_result" | sed 's/^/   /'
    echo ""
    VALIDATION_FAILED=1
    FAILED_FILES+=("$spec_file")
  else
    echo -e "${GREEN}✅ $spec_file${NC}"
    VALIDATED_COUNT=$((VALIDATED_COUNT + 1))
  fi
done

echo ""

# Final result
if [ $VALIDATION_FAILED -eq 1 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}🚨 COMMIT BLOCKED: Invalid YAML frontmatter${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  ${VALIDATED_COUNT} file(s) passed, ${#FAILED_FILES[@]} file(s) failed validation"
  echo ""
  echo "  📋 Valid frontmatter format:"
  echo "     ${GREEN}---${NC}"
  echo "     ${GREEN}increment: 0001-feature-name${NC}"
  echo "     ${GREEN}title: Feature Title        ${NC}  # Optional"
  echo "     ${GREEN}feature_id: FS-001          ${NC}  # Optional"
  echo "     ${GREEN}---${NC}"
  echo ""
  echo "  ❌ Common mistakes:"
  echo "     - Unclosed brackets: ${RED}data: [unclosed${NC}"
  echo "     - Unclosed quotes: ${RED}title: \"unclosed${NC}"
  echo "     - Invalid syntax: ${RED}key: {broken${NC}"
  echo "     - Missing increment: ${RED}title: Feature${NC} (no increment field!)"
  echo "     - Wrong format: ${RED}increment: 1-test${NC} (should be 0001-test)"
  echo ""
  echo "  🔧 How to fix:"
  for failed_file in "${FAILED_FILES[@]}"; do
    echo "     vim $failed_file"
  done
  echo ""
  echo "  📖 See: CLAUDE.md → Rule #16 'YAML Frontmatter Validation'"
  echo ""
  echo "  ⚠️  To bypass (NOT recommended): git commit --no-verify"
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ All YAML frontmatter valid ($VALIDATED_COUNT file(s))${NC}"
echo ""
exit 0
