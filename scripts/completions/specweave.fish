# Fish completion for SpecWeave CLI
#
# Installation:
#   cp specweave.fish ~/.config/fish/completions/specweave.fish
#

# Plugin groups
set -l plugin_groups core github jira ado frontend backend infra ml kafka confluent mobile payments release testing diagrams all

# Main commands
set -l commands init install list pause resume abandon archive status progress status-line logs auto auto-status cancel-auto update-instructions check-discipline revert-wip-limit qa validate-plugins validate-jira jobs living-docs cache commits sync-scheduled sync-progress docs context enable-multiproject switch-project refresh-marketplace cache-status cache-refresh export-skills set-sync-target migrate-memory load-plugins unload-plugins plugin-status save

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
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a load-plugins -d "Load plugin groups (lazy loading)"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a unload-plugins -d "Unload plugin groups"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a plugin-status -d "Show plugin status"
complete -c specweave -n "not __fish_seen_subcommand_from $commands" -a save -d "Smart save with auto-sync"

# load-plugins subcommand
complete -c specweave -n "__fish_seen_subcommand_from load-plugins" -a "$plugin_groups" -d "Plugin group"
complete -c specweave -n "__fish_seen_subcommand_from load-plugins" -l force -s f -d "Force reinstall"
complete -c specweave -n "__fish_seen_subcommand_from load-plugins" -l background -s b -d "Run in background"
complete -c specweave -n "__fish_seen_subcommand_from load-plugins" -l verbose -s v -d "Show detailed output"
complete -c specweave -n "__fish_seen_subcommand_from load-plugins" -l list-groups -d "Show available groups"

# unload-plugins subcommand
complete -c specweave -n "__fish_seen_subcommand_from unload-plugins" -a "$plugin_groups" -d "Plugin group"
complete -c specweave -n "__fish_seen_subcommand_from unload-plugins" -l no-keep-router -d "Also unload router"
complete -c specweave -n "__fish_seen_subcommand_from unload-plugins" -l verbose -s v -d "Show detailed output"
complete -c specweave -n "__fish_seen_subcommand_from unload-plugins" -l dry-run -d "Preview without unloading"
complete -c specweave -n "__fish_seen_subcommand_from unload-plugins" -l list-groups -d "Show available groups"

# plugin-status subcommand
complete -c specweave -n "__fish_seen_subcommand_from plugin-status" -l verbose -s v -d "Show detailed information"

# init subcommand
complete -c specweave -n "__fish_seen_subcommand_from init" -l template -s t -a "saas api fullstack" -d "Project template"
complete -c specweave -n "__fish_seen_subcommand_from init" -l adapter -s a -a "claude cursor copilot generic" -d "AI tool adapter"
complete -c specweave -n "__fish_seen_subcommand_from init" -l language -s l -a "en ru es zh de fr ja ko pt" -d "Language"
complete -c specweave -n "__fish_seen_subcommand_from init" -l force -s f -d "Force fresh start"
complete -c specweave -n "__fish_seen_subcommand_from init" -l full -d "Install all plugins (skip lazy loading)"

# refresh-marketplace subcommand
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l local -d "Use local version"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l github -d "Pull from GitHub"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l force -s f -d "Force reinstall"
complete -c specweave -n "__fish_seen_subcommand_from refresh-marketplace" -l verbose -s v -d "Show detailed errors"

# docs subcommand
complete -c specweave -n "__fish_seen_subcommand_from docs" -a "preview build validate kill status" -d "Docs subcommand"

# Global help option
complete -c specweave -l help -s h -d "Show help"
