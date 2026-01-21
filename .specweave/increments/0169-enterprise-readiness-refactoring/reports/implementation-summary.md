## Implementation Summary (Auto-Generated)

*Generated from codebase scan on 2026-01-15T02:08:16.115Z*
*Increment: 0169-enterprise-readiness-refactoring*

### Modified Files

#### `src/cli/commands/`

- `abandon.ts` (21 lines) - exports: abandonCommand; functions: abandonCommand
- `analytics.ts` (167 lines) - exports: analyticsCommand; functions: formatNumber, pad, progressBar, formatSuccessRate, renderDashboard...
- `archive.ts` (130 lines) - exports: archiveCommand; functions: archiveCommand, formatSize
- `auto-simple.ts` (265 lines) - exports: AutoCommandOptions, createAutoCommand, handleAutoCommand; functions: createAutoCommand, handleAutoCommand, handlePromptChunking, findIncrementsByStatus, printDryRunPreview...
- `auto-status.ts` (159 lines) - exports: AutoStatusOptions, createAutoStatusCommand; functions: createAutoStatusCommand, handleAutoStatus, findActiveIncrements
- `auto.ts` (328 lines) - exports: AutoCommandOptions, createAutoCommand, handleAutoCommand; functions: createAutoCommand, handleAutoCommand, handlePromptMode, findBacklogIncrements, findActiveIncrements...
- `cache-refresh.ts` (194 lines) - exports: CacheRefreshOptions, cacheRefresh, registerCacheRefreshCommand; functions: cacheRefresh, registerCacheRefreshCommand
- `cache-status.ts` (278 lines) - exports: CacheStatusOptions, cacheStatus, registerCacheStatusCommand; functions: cacheStatus, checkPlugin, displayResults, registerCacheStatusCommand
- `cache.ts` (142 lines) - exports: CacheOptions, cacheCommand; functions: cacheCommand, formatTimeAgo
- `cancel-auto.ts` (140 lines) - exports: CancelAutoOptions, createCancelAutoCommand; functions: createCancelAutoCommand, handleCancelAuto, getUserInput
- `check-discipline.ts` (99 lines) - exports: checkDisciplineCommand; functions: checkDisciplineCommand
- `check-hooks.ts` (414 lines) - exports: checkReflectHealth, checkCacheHealth; functions: parseArgs, checkReflectHealth, checkCacheHealth, main, getExitCode
- `cicd-monitor.ts` (205 lines) - exports: registerCICDMonitorCommand; functions: loadConfig, startMonitor, queryStatus, clearState, registerCICDMonitorCommand
- `cleanup-cache.ts` (84 lines) - exports: CleanupCacheOptions, cleanupCache; functions: cleanupCache, parseAge, formatBytes
- `cleanup-plugins.ts` (85 lines)
- `commits.ts` (44 lines) - exports: commitsCommand; functions: commitsCommand
- `context.ts` (290 lines) - exports: getProjectsContext, getBoardsContext, autoSelectProjectBoard, contextProjectsCommand, contextBoardsCommand...; functions: getProjectsContext, getBoardsContext, autoSelectProjectBoard, contextProjectsCommand, contextBoardsCommand...
- `delete-feature.ts` (102 lines) - exports: registerDeleteFeatureCommand; functions: validateFeatureId, registerDeleteFeatureCommand
- `detect-project.ts` (112 lines) - functions: main, calculateConfidence
- `detect-specs.ts` (86 lines) - functions: main
- `discrepancies.ts` (481 lines) - exports: DiscrepanciesOptions, createDiscrepanciesCommand, listDiscrepancies, runCheck, showDiscrepancy...; functions: createDiscrepanciesCommand, listDiscrepancies, runCheck, showDiscrepancy, acceptDiscrepancy...
- `docs.ts` (378 lines) - exports: DocsPreviewOptions, DocsBuildOptions, DocsValidateOptions, docsPreviewCommand, docsBuildCommand...; functions: docsPreviewCommand, docsBuildCommand, docsValidateCommand, docsKillCommand, docsStatusCommand
- `export-skills.ts` (340 lines) - exports: ExportSkillsOptions, exportSkills, exportSkillsCommand; functions: parseFrontmatter, convertSkill, validateAgentSkill, generateSkillMd, exportSkills...
- `import-docs.ts` (184 lines) - exports: ImportDocsArgs, importDocs, parseImportDocsArgs; functions: importDocs, parseImportDocsArgs
- `import-external.ts` (444 lines) - exports: ImportExternalArgs, importExternal; functions: getExistingSyncProfiles, detectConfiguredTools, parseTimeRange, getPlatformEmoji, importExternal
- `init-multiproject.ts` (223 lines) - exports: initMultiProject, listProjects; functions: initMultiProject, createAdditionalProjects, listProjects
- `init.ts` (952 lines) - exports: initCommand; functions: isSpecWeaveFrameworkRepo, createMultiProjectFolders, initCommand, installNonClaudeAdapter, setupIssueTrackerWrapper...
- `install-hooks.ts` (84 lines) - exports: registerInstallHooksCommand; functions: registerInstallHooksCommand
- `install.ts` (158 lines) - exports: installCommand; functions: installCommand, installComponent, installAll, installAllAgents, installAllSkills
- `jobs.ts` (575 lines) - exports: jobsCommand, createJobsCommand; functions: jobsCommand, createJobsCommand, getJobProvider, handleListJobs, printJobSummary...
- `list.ts` (156 lines) - exports: listCommand; functions: listCommand, listAllComponents, listInstalledComponents, listComponentsInDir
- `living-docs.ts` (531 lines) - exports: LivingDocsOptions, livingDocsCommand; functions: livingDocsCommand, runChunkedLivingDocs, getOrphanedLivingDocsJobs, getRunningLivingDocsJob, promptResumeOrphanedJob...
- `logs.ts` (146 lines) - exports: LogsCommandOptions, logsCommand; functions: logsCommand, displayTable, formatStatus, pad, truncate
- `merge-skill-memories.ts` (233 lines) - exports: SkillMemoryMergeResult, mergeSkillMemoriesOnRefresh, mergeSkillMemory; functions: getInstalledSkillsDir, getSkillNames, backupMemoryFile, mergeSkillMemoriesOnRefresh, mergeSkillMemory
- `migrate-config.ts` (183 lines) - exports: MigrateConfigOptions, migrateConfig; functions: migrateConfig, maskSecret
- `migrate-memory.ts` (180 lines) - exports: MigrateMemoryOptions, migrateMemory, needsMemoryMigration, getMemoryMigrationStatus; functions: migrateMemory, needsMemoryMigration, getMemoryMigrationStatus
- `migrate-to-multiproject.ts` (279 lines) - exports: MigrationResult, autoMigrateSingleToMulti, isMigrationNeeded, rollbackMigration; functions: autoMigrateSingleToMulti, isMigrationNeeded, rollbackMigration
- `migrate-to-profiles.ts` (465 lines) - exports: migrateToProfiles, detectOldConfiguration, createGitHubProfile, createJiraProfile, createAdoProfile...; functions: migrateToProfiles, detectOldConfiguration, detectGitHubRepo, detectProjectName, parseEnv...
- `next-command.ts` (275 lines) - exports: NextCommandConfig, executeNextCommand, parseArgs, displayHelp; functions: executeNextCommand, executeInteractiveMode, executeAutonomousMode, displayPhaseDetection, displaySuggestedAction...
- `notifications.ts` (312 lines) - exports: NotificationsOptions, createNotificationsCommand, listNotifications, showNotification, dismissNotification...; functions: createNotificationsCommand, listNotifications, showNotification, dismissNotification, dismissAllNotifications...
- `pause.ts` (21 lines) - exports: pauseCommand; functions: pauseCommand
- `plan-command.ts` (148 lines) - exports: executePlanCommand, showPlanHelp; functions: executePlanCommand, parseArgs, showPlanHelp
- `plugin-status.ts` (215 lines) - exports: PluginStatusOptions, pluginStatusCommand; functions: pluginStatusCommand, displayPlugin, discoverPlugins
- `project.ts` (638 lines) - exports: ProjectCommandOptions, projectListCommand, projectAddCommand, projectRemoveCommand, projectSyncCommand...; functions: projectListCommand, projectAddCommand, projectRemoveCommand, projectSyncCommand, projectShowCommand...
- `qa.ts` (126 lines) - exports: qaCommand; functions: qaCommand
- `refresh-marketplace.ts` (573 lines) - exports: refreshMarketplaceCommand; functions: runCommand, checkMarketplaceExists, getMarketplaceInstallPath, getPluginsFromMarketplace, getPluginVersion...
- `repair-status-desync.ts` (308 lines) - exports: RepairOptions, RepairResult, AuditEntry, createBackup, repairDesync...; functions: createBackup, repairDesync, repairStatusDesync, writeAuditLog, formatRepairReport...
- `resume.ts` (19 lines) - exports: resumeCommand; functions: resumeCommand
- `revert-wip-limit.ts` (78 lines) - exports: revertWipLimitCommand; functions: revertWipLimitCommand
- `save.ts` (815 lines) - exports: SaveOptions, executeSave; functions: executeSave, detectRepositories, getRepoInfo, checkSyncState, syncRepository...
- `set-sync-target.ts` (154 lines) - exports: createSetSyncTargetCommand; functions: setSyncTarget, validateSyncTarget, createSetSyncTargetCommand
- `skill-match.ts` (131 lines) - exports: SkillMatchOptions, skillMatchCommand; functions: skillMatchCommand, getScoreDisplay, displayMatch
- `status-line.ts` (75 lines) - exports: registerStatusLineCommand; functions: registerStatusLineCommand
- `status.ts` (32 lines) - exports: statusCommand; functions: statusCommand
- `sync-living-docs-acs.ts` (126 lines)
- `sync-logs.ts` (306 lines) - exports: SyncLogsOptions, createSyncLogsCommand, runSyncLogs; functions: createSyncLogsCommand, runSyncLogs, formatLogOutput, formatLogLine, formatTimestamp...
- `sync-monitor.ts` (234 lines) - exports: SyncMonitorOptions, createSyncMonitorCommand, runSyncMonitor; functions: createSyncMonitorCommand, runSyncMonitor, formatDashboard, formatJobLine, boxLine...
- `sync-progress.ts` (470 lines) - exports: SyncProgressArgs, SyncProgressResult, syncProgress; functions: syncProgress, parseArgs, detectActiveIncrement, findIncrementPath, isProviderConfigured...
- `sync-scheduled.ts` (220 lines) - exports: SyncScheduledOptions, createSyncScheduledCommand; functions: createSyncScheduledCommand, runScheduledSync, runForcedSync, printResult, createSilentLogger
- `sync-spec-commits.ts` (225 lines) - functions: main, syncGitHub, syncJira, syncAdo, detectIncrementPath...
- `sync-spec-content.ts` (262 lines) - functions: formatActionVerb, main, syncGitHub, syncJira, syncAdo...
- `sync-specs.ts` (212 lines) - exports: SyncSpecsArgs, syncSpecs; functions: syncSpecs, parseArgs, findAllSyncableIncrements, findCompletedIncrements, findLatestCompletedIncrement
- `update-instructions.ts` (193 lines) - exports: updateInstructionsCommand; functions: updateInstructionsCommand, updateFile, detectProjectName, formatAction
- `validate-jira.ts` (137 lines) - exports: setupValidateJiraCommand; functions: setupValidateJiraCommand, runJiraValidation, displaySuccess, displayFailure
- `validate-plugins.ts` (253 lines) - exports: setupValidatePluginsCommand; functions: setupValidatePluginsCommand, runValidation, displaySuccess, displayFailure, showManualInstructions
- `validate-status-sync.ts` (231 lines) - exports: DesyncSeverity, DesyncResult, calculateSeverity, validateStatusSync, formatReport...; functions: calculateSeverity, validateStatusSync, formatReport, main

#### `src/cli/commands/plan/`

- `agent-invoker.ts` (449 lines) - exports: AgentInvocationResult, AgentInvoker; classes: AgentInvoker
- `increment-detector.ts` (181 lines) - exports: IncrementDetector; classes: IncrementDetector
- `plan-orchestrator.ts` (284 lines) - exports: PlanCommandOrchestrator; classes: PlanCommandOrchestrator
- `plan-validator.ts` (208 lines) - exports: PlanValidator; classes: PlanValidator
- `types.ts` (225 lines) - exports: PlanCommandConfig, IncrementDetectionResult, PlanValidationResult, PlanValidationError, PlanValidationWarning...

#### `src/cli/helpers/`

- `ado-area-path-mapper.ts` (254 lines) - exports: AreaPathGranularity, AreaPathMapping, AreaPathMapperOptions, promptAreaPathGranularity, promptTeamSelection...; functions: promptAreaPathGranularity, promptTeamSelection, promptAreaPathSelection, createAreaPathMapping, formatAreaPath...
- `ado-area-selector.ts` (345 lines) - exports: ADOAreaPath, AreaSelectionConfig, filterAreaPathsByPattern, filterAreaPathsByRegex, showAreaPathPreview...; functions: filterAreaPathsByPattern, filterAreaPathsByRegex, showAreaPathPreview, extractLeafName, toAreaPathObjects...
- `async-project-loader.ts` (485 lines) - exports: ProjectProvider, Project, FetchOptions, FetchResult, FetchError...; classes: AsyncProjectLoader
- `cancelation-handler.ts` (235 lines) - exports: CancelationOptions, CancelationState, CancelationHandler; classes: CancelationHandler
- `github-repo-selector.ts` (425 lines) - exports: GitHubRepo, RepoSelectionConfig, fetchUserOrganizations, fetchOrgRepositories, fetchPersonalRepositories...; functions: fetchUserOrganizations, fetchOrgRepositories, fetchPersonalRepositories, filterRepositoriesByPattern, filterRepositoriesByRegex...
- `import-strategy-prompter.ts` (252 lines) - exports: ImportStrategy, StrategyPromptResult, StrategyPrompterOptions, promptImportStrategy; functions: promptImportStrategy, handlePatternGlob, handlePatternRegex, handleManualEntry, showSafetyConfirmation

#### `src/cli/helpers/github/`

- `increment-profile-selector.ts` (250 lines) - exports: selectProfileForIncrement, saveIncrementProfile, getIncrementProfile, changeIncrementProfile, listIncrementsByProfile; functions: selectProfileForIncrement, saveIncrementProfile, getIncrementProfile, changeIncrementProfile, listIncrementsByProfile
- `profile-manager.ts` (377 lines) - exports: GitHubProfile, GitHubProfileManager; classes: GitHubProfileManager

#### `src/cli/helpers/init/`

- `ado-repo-cloning.ts` (199 lines) - exports: AdoProjectSelection, triggerAdoRepoCloning; functions: creates, sanitizeProjectNameForPath, buildAdoCloneUrl, triggerAdoRepoCloning
- `api-docs-config.ts` (515 lines) - exports: ApiDocsConfig, DetectedApiFramework, detectApiFramework, ApiDocsConfigResult, promptApiDocsConfig...; functions: getApiDocsStrings, detectApiFramework, promptApiDocsConfig, updateConfigWithApiDocs
- `bitbucket-repo-cloning.ts` (364 lines) - exports: BitbucketRepoSelection, triggerBitbucketRepoCloning; functions: sleep, fetchBitbucketRepos, buildBitbucketCloneUrl, triggerBitbucketRepoCloning
- `brownfield-analysis.ts` (500 lines) - exports: AnalysisDepth, DetectedDocsLocation, BrownfieldAnalysisConfig, detectExistingDocsLocations, promptBrownfieldAnalysis...; functions: getBrownfieldStrings, detectExistingDocsLocations, countDocFiles, checkForJsDoc, promptBrownfieldAnalysis...
- `config-detection.ts` (228 lines) - exports: detectGitHubRemote, detectJiraConfig, detectADOConfig, detectAllConfigs; functions: getEnvVar, detectGitHubRemote, detectJiraConfig, detectADOConfig, detectAllConfigs
- `directory-structure.ts` (420 lines) - exports: createDirectoryStructure, scanAndSuggestMerges, copyTemplates, createConfigFile; functions: createDirectoryStructure, createBasicDocsStructure, scanAndSuggestMerges, copyTemplates, createConfigFile
- `external-import-grouping.ts` (381 lines) - exports: ContainerGroup, groupItemsBySourceRepo, groupItemsByExternalContainer, groupAdoItemsByParentHierarchy, groupNonHierarchyItems; functions: groupItemsBySourceRepo, groupItemsByExternalContainer, groupAdoItemsByParentHierarchy, findTopLevelParent, groupNonHierarchyItems
- `external-import.ts` (1389 lines) - exports: ImportOptions, promptAndRunExternalImport, BackgroundImportResult, __test__; functions: getExternalImportStrings, buildAdoConfigFromProjects, buildJiraConfigFromProjects, promptAndRunExternalImport, is...
- `git-hooks-installer.ts` (146 lines) - exports: installGitHooks, uninstallGitHooks, areGitHooksInstalled; functions: installGitHooks, uninstallGitHooks, areGitHooksInstalled
- `github-repo-cloning.ts` (482 lines) - exports: GitHubRepoSelection, GitHubCloningResult, triggerGitHubRepoCloning; functions: parseRateLimitHeaders, sleep, fetchGitHubRepos, buildGitHubHttpsCloneUrl, buildGitHubSshCloneUrl...
- `index.ts` (129 lines)
- `initial-increment-generator.ts` (426 lines) - exports: InitialIncrementOptions, generateInitialIncrement; functions: generateInitialIncrement, generateSpecMd, generateFrontmatter, generateSingleProjectUserStories, generateMultiProjectUserStories...
- `instruction-file-merger.ts` (303 lines) - exports: TemplateType, TemplateSection, MergeResult, mergeInstructionFile, parseTemplateSections...; functions: parseFile, wrap, genMeta, fresh, mergeInstructionFile...
- `jira-ado-auto-detect.ts` (1017 lines) - exports: TeamPattern, JiraProjectInfo, AdoProjectInfo, StructureAnalysis, JiraStructure...; functions: detectTeamPattern, generateReasoning, analyzeJiraStructureDeep, analyzeAdoStructureDeep, selectJiraHierarchyMapping...
- `language-selection.ts` (343 lines) - exports: LanguageSelectionResult, getLanguageNativeName, promptLanguageSelection, getDefaultLanguageSelection; functions: getLanguageChoices, getBilingualWarnings, getPromptStrings, getLanguageNativeName, promptLanguageSelection...
- `living-docs-preflight.ts` (587 lines) - exports: PreflightOptions, PreflightResult, detectBrownfield, detectExistingDocs, AnalysisDepth...; functions: getPreflightStrings, detectBrownfield, detectExistingDocs, estimateDuration, countFiles...
- `next-steps.ts` (162 lines) - exports: ShowNextStepsOptions, showNextSteps; functions: getNextStepsStrings, showNextSteps
- `path-utils.ts` (152 lines) - exports: findPackageRoot, findSourceDir, detectNestedSpecweave, countFilesRecursive; functions: findPackageRoot, findExistingPath, findSourceDir, detectNestedSpecweave, countFilesRecursive
- `plugin-installer.ts` (635 lines) - exports: PluginInstallOptions, PluginInstallResult, installAllPlugins; functions: installAllPlugins, refreshMarketplace, enableMarketplaceAutoUpdate, registerMarketplaceFallback, manuallyInstallSpecweavePlugin...
- `repository-setup.ts` (1426 lines) - exports: RepositorySetupOptions, AdoCloneStrategy, AdoClonePatternResult, GitHubRepoSelection, BitbucketRepoSelection...; functions: safeParseJsonResponse, fetchAdoProjects, promptAdoProjectSelection, promptGitHubRepoSelection, promptBitbucketRepoSelection...
- `smart-reinit.ts` (552 lines) - exports: SmartReinitOptions, SmartReinitResult, promptSmartReinit; functions: getSmartReinitStrings, promptSmartReinit, handleFreshStart
