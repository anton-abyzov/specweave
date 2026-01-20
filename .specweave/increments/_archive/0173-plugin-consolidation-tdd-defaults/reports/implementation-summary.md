## Implementation Summary (Auto-Generated)

*Generated from codebase scan on 2026-01-20T05:32:11.859Z*
*Increment: 0173-plugin-consolidation-tdd-defaults*

### Modified Files

#### `bin/`

- `specweave.js` (1204 lines) - functions: isVersionSatisfied, getUpgradeInstructions, checkForDuplicates

#### `src/cli/commands/`

- `auto.ts` (650 lines) - exports: AutoCommandOptions, createAutoCommand, handleAutoCommand, isParallelModeRequested, getSelectedDomains...; functions: createAutoCommand, handleAutoCommand, findIncrementsByStatus, findIncrementByIdOrPrefix, activateIncrement...
- `update-instructions.ts` (275 lines) - exports: updateInstructionsCommand; functions: updateInstructionsCommand, updateFile, detectProjectName, formatAction, migrateConfig
- `update.ts` (414 lines) - exports: updateCommand, registerUpdateCommand; functions: updateCommand, validateProjectHealth, selfUpdateSpecWeave, registerUpdateCommand

#### `src/cli/helpers/init/`

- `directory-structure.ts` (453 lines) - exports: createDirectoryStructure, scanAndSuggestMerges, copyTemplates, createConfigFile; functions: createDirectoryStructure, createBasicDocsStructure, scanAndSuggestMerges, copyTemplates, createConfigFile
- `gitignore-generator.ts` (803 lines) - exports: DetectedTech, TechCategory, TechStackDetection, detectTechStack, generateGitignore...; functions: detectTechStack, getTechCategory, findFilesWithPattern, generateGitignore, generateRepoGitignore...
- `index.ts` (141 lines)
- `testing-config.ts` (469 lines) - exports: TestingConfigResult, promptTestingConfig, updateConfigWithTesting; functions: getTestingStrings, promptTestingConfig, updateConfigWithTesting

#### `src/core/auto/`

- `types.ts` (415 lines) - exports: AgentDomain, AgentStatus, WorktreeInfo, ParallelAgent, ParallelSession...; functions: isAgentDomain, isAgentStatus, isGitProvider

#### `src/core/increment/`

- `status-commands.ts` (400 lines) - exports: PauseOptions, ResumeOptions, AbandonOptions, StatusOptions, pauseIncrement...; functions: getTypeLimits, pauseIncrement, resumeIncrement, abandonIncrement, completeIncrement...

#### `src/core/lazy-loading/`

- `keyword-detector.ts` (988 lines) - exports: DetectionResult, SPECWEAVE_KEYWORDS, PLUGIN_GROUPS, DEVELOPMENT_KEYWORDS, detectSpecWeaveIntent...; functions: logDetection, findProjectRoot, detectSpecWeaveIntent, determinePlugins, getPluginGroups...

#### `src/core/reflection/`

- `learning-validator.ts` (461 lines) - exports: LearningConfidence, SignalType, ValidationInput, ValidationResult, ValidatedLearning...; classes: LearningValidator; functions: createValidator, validateLearning

#### `src/core/skills/`

- `activation-tracker.ts` (200 lines) - exports: ActivationRecord, ActivationState, loadActivations, initSession, trackActivation...; functions: getStatePath, loadActivations, initSession, trackActivation, clearActivations...
- `api-validator.ts` (618 lines) - exports: AuthStrategy, EndpointTest, ApiTestConfig, EndpointTestResult, ApiTestResult...; classes: ApiValidator; functions: validateApi, generatePostmanFromConfig
- `skill-judge.ts` (598 lines) - exports: JudgeVerdict, DomainCriteria, JudgeInput, JudgeResult, DomainCheck...; classes: ProgressLogger, SkillJudge; functions: for, judgeSkillOutput, judgeWithSpec
- `skill-validator.ts` (619 lines) - exports: ValidationStep, PreviewConfig, EndpointTest, ApiTestConfig, ValidationConfig...; classes: SkillValidator; functions: validateSkill, validateProject

#### `src/core/workflow/`

- `autonomous-executor.ts` (381 lines) - exports: AutonomousConfig, AutonomousResult, AutonomousExecutor; classes: AutonomousExecutor

#### `tests/unit/`

- `increment-utils.test.ts` (633 lines)

#### `tests/unit/cli/commands/`

- `auto.test.ts` (283 lines)

#### `tests/unit/core/lazy-loading/`

- `agent-sdk-integration.test.ts` (441 lines)
- `keyword-detector.test.ts` (417 lines)

#### `tests/unit/reflection/`

- `learning-validator.test.ts` (343 lines)

#### `tests/unit/skills/`

- `activation-tracker.test.ts` (289 lines)
- `api-validator.test.ts` (310 lines)
- `skill-judge.test.ts` (575 lines) - functions: login, handleRequest, Component, Component, service...
- `skill-validator.test.ts` (247 lines)
