## Implementation Summary (Auto-Generated)

*Generated from codebase scan on 2026-01-07T21:55:48.321Z*
*Increment: 0158-smart-completion-conditions*

### Modified Files

#### `plugins/specweave/scripts/`

- `detect-project-type.js` (26 lines)
- `get-default-conditions.js` (49 lines)

#### `src/core/auto/`

- `default-conditions.ts` (279 lines) - exports: MANDATORY_CONDITIONS, getDefaultConditions, mergeConditions, validateUserConditions, describeConditions; functions: getDefaultConditions, mergeConditions, validateUserConditions, describeConditions
- `project-detector.ts` (428 lines) - exports: ProjectType, Indicator, ProjectDetection, detectProjectType, getProjectTypeDescription; functions: detectProjectType, checkIndicator, checkConfigIndicator, detectFrameworks, detectTestFrameworks...
