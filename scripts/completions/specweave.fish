# Fish completion for SpecWeave CLI
#
# Installation:
#   cp specweave.fish ~/.config/fish/completions/specweave.fish
#

# Main commands (synced with bin/specweave.js)
set -l commands init install list pause resume abandon complete create-increment archive save status progress interview logs decision-log status-line auto auto-status cancel-auto team update-instructions update check-discipline revert-wip-limit qa validate-jira jobs living-docs cache analytics lsp commits sync-scheduled sync-progress docs context refresh-marketplace doctor export-skills set-sync-target dashboard

# Disable file completion for specweave
complete -c specweave -f

# Main commands
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a init -d "Initialize a new SpecWeave project"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a install -d "Install agents/skills"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a list -d "List available components"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a status -d "Show increment status"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a auto -d "Start autonomous execution"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a qa -d "Run quality assessment"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a docs -d "Documentation preview/build"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a refresh-marketplace -d "Refresh marketplace plugins"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a save -d "Smart save with auto-sync"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a dashboard -d "Launch observability dashboard"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a doctor -d "Run comprehensive health check"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a team -d "Launch agent teams"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a analytics -d "Show usage analytics"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a jobs -d "Monitor background jobs"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a living-docs -d "Launch Living Docs Builder"

# init subcommand
complete -c specweave -n "__fish_seen_subcommand_from init" -l template -s t -a "saas api fullstack" -d "Project template"
complete -c specweave -n "__fish_seen_subcommand_from init" -l adapter -s a -a "claude cursor copilot generic" -d "AI tool adapter"
complete -c specweave -n "__fish_seen_subcommand_from init" -l language -s l -a "en ru es zh de fr ja ko pt" -d "Language"
complete -c specweave -n "__fish_seen_subcommand_from init" -l force -s f -d "Force fresh start"
complete -c specweave -n "__fish_seen_subcommand_from init" -l full -d "Install all plugins (skip lazy loading)"

# refresh-marketplace subcommand
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l all -d "Install ALL plugins (legacy mode)"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l minimal -d "Remove marketplace, install only core"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l force -s f -d "Force reinstall"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l verbose -s v -d "Show detailed errors"

# docs subcommand
complete -c specweave -n "__fish_seen_subcommand_from docs" -a "preview build validate kill status" -d "Docs subcommand"

# Global help option
complete -c specweave -l help -s h -d "Show help"
