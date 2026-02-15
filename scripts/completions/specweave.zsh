#compdef specweave
#
# Zsh completion for SpecWeave CLI
#
# Installation:
#   1. Copy to your fpath:
#      cp specweave.zsh ~/.zsh/completions/_specweave
#
#   2. Add to your .zshrc:
#      fpath=(~/.zsh/completions $fpath)
#      autoload -Uz compinit && compinit
#
#   3. Or source directly (less recommended):
#      source /path/to/specweave.zsh
#

# Main commands (synced with bin/specweave.js)
local -a commands
commands=(
    'init:Initialize a new SpecWeave project'
    'install:Install agents/skills'
    'list:List available components'
    'pause:Pause an active increment'
    'resume:Resume a paused increment'
    'abandon:Abandon an increment'
    'complete:Complete an increment'
    'create-increment:Create increment template files'
    'archive:Archive completed increments'
    'save:Smart save with auto-sync'
    'status:Show increment status overview'
    'progress:Show increment status (alias for status)'
    'interview:Manage Deep Interview Mode'
    'logs:View hook execution logs'
    'decision-log:Query structured decision logs'
    'status-line:Display current increment status line'
    'auto:Start autonomous execution'
    'auto-status:Check auto session status'
    'cancel-auto:Cancel running auto session'
    'team:Launch Claude Code with agent teams'
    'update-instructions:Update CLAUDE.md and AGENTS.md'
    'update:Update SpecWeave CLI and project files'
    'check-discipline:Validate increment discipline'
    'revert-wip-limit:Revert WIP limit to original'
    'qa:Run quality assessment'
    'validate-jira:Validate Jira configuration'
    'jobs:Monitor background jobs'
    'living-docs:Launch Living Docs Builder'
    'cache:Manage dashboard cache'
    'analytics:Show usage analytics dashboard'
    'lsp:LSP code intelligence'
    'commits:Display last git commits'
    'sync-scheduled:Execute scheduled sync jobs'
    'sync-progress:Comprehensive progress sync'
    'docs:Documentation preview and build'
    'context:Get project/board context'
    'refresh-marketplace:Refresh marketplace plugins'
    'doctor:Run comprehensive health check'
    'export-skills:Export skills to Agent Skills format'
    'set-sync-target:Set sync target for increment'
    'dashboard:Launch real-time observability dashboard'
)

_specweave() {
    local curcontext="$curcontext" state line

    _arguments -C \
        '1: :->command' \
        '*::arg:->args'

    case $state in
        command)
            _describe -t commands 'specweave commands' commands
            ;;
        args)
            case $line[1] in
                init)
                    _arguments \
                        '1:project name:' \
                        '--template[Project template]:template:(saas api fullstack)' \
                        '--adapter[AI tool adapter]:adapter:(claude cursor copilot generic)' \
                        '--tech-stack[Technology stack]:stack:' \
                        '--language[Language for content]:language:(en ru es zh de fr ja ko pt)' \
                        '--force[Force fresh start]' \
                        '--force-refresh[Force marketplace refresh]' \
                        '--no-living-docs[Skip living docs setup]' \
                        '--full[Install all plugins (skip lazy loading)]' \
                        '--help[Show help]'
                    ;;
                refresh-marketplace)
                    _arguments \
                        '--all[Install ALL plugins (legacy mode)]' \
                        '--minimal[Remove marketplace, install only core]' \
                        '--force[Force reinstall all plugins]' \
                        '--verbose[Show detailed errors]' \
                        '--help[Show help]'
                    ;;
                status)
                    _arguments \
                        '--verbose[Show detailed information]' \
                        '--type[Filter by increment type]:type:(feature hotfix bug)' \
                        '--help[Show help]'
                    ;;
                auto)
                    _arguments \
                        '*:increment IDs:' \
                        '--dry-run[Preview without activating]' \
                        '--all-backlog[Activate all backlog items]' \
                        '--reset[Clean up stale state files]' \
                        '--help[Show help]'
                    ;;
                qa)
                    _arguments \
                        '1:increment ID:' \
                        '--quick[Quick mode (default)]' \
                        '--pre[Pre-implementation check]' \
                        '--gate[Quality gate check]' \
                        '--full[Full multi-agent mode]' \
                        '--ci[CI mode]' \
                        '--no-ai[Skip AI assessment]' \
                        '--silent[Minimal output]' \
                        '--export[Export blockers to tasks.md]' \
                        '--force[Force run]' \
                        '--verbose[Show recommendations]' \
                        '--help[Show help]'
                    ;;
                docs)
                    _arguments \
                        '1: :->subcommand' \
                        '*::arg:->subargs'
                    case $state in
                        subcommand)
                            local -a docs_commands
                            docs_commands=(
                                'preview:Start docs preview server'
                                'build:Build static docs site'
                                'validate:Validate documentation'
                                'kill:Stop docs servers'
                                'status:Show docs status'
                            )
                            _describe -t docs_commands 'docs subcommands' docs_commands
                            ;;
                    esac
                    ;;
                *)
                    _arguments \
                        '--help[Show help]'
                    ;;
            esac
            ;;
    esac
}

_specweave "$@"
