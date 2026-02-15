#!/usr/bin/env bash
#
# Bash completion for SpecWeave CLI
#
# Installation:
#   1. Source this file in your .bashrc or .bash_profile:
#      source /path/to/specweave.bash
#
#   2. Or copy to your bash-completion directory:
#      cp specweave.bash /usr/local/etc/bash_completion.d/specweave
#      # or
#      cp specweave.bash ~/.bash_completion.d/specweave
#

_specweave_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands (synced with bin/specweave.js)
    local main_commands="init install list pause resume abandon complete create-increment archive save status progress interview logs decision-log status-line auto auto-status cancel-auto team update-instructions update check-discipline revert-wip-limit qa validate-jira jobs living-docs cache analytics lsp commits sync-scheduled sync-progress docs context refresh-marketplace doctor export-skills set-sync-target dashboard"

    case "${prev}" in
        specweave)
            COMPREPLY=( $(compgen -W "${main_commands}" -- "${cur}") )
            return 0
            ;;
        init)
            COMPREPLY=( $(compgen -W "--template --adapter --tech-stack --language --force --force-refresh --no-living-docs --full --help" -- "${cur}") )
            return 0
            ;;
        refresh-marketplace)
            COMPREPLY=( $(compgen -W "--all --minimal --force --verbose --help" -- "${cur}") )
            return 0
            ;;
        status)
            COMPREPLY=( $(compgen -W "--verbose --type --help" -- "${cur}") )
            return 0
            ;;
        auto)
            COMPREPLY=( $(compgen -W "--dry-run --all-backlog --reset --help" -- "${cur}") )
            return 0
            ;;
        qa)
            COMPREPLY=( $(compgen -W "--quick --pre --gate --full --ci --no-ai --silent --export --force --verbose --help" -- "${cur}") )
            return 0
            ;;
        docs)
            COMPREPLY=( $(compgen -W "preview build validate kill status --help" -- "${cur}") )
            return 0
            ;;
        --template|-t)
            COMPREPLY=( $(compgen -W "saas api fullstack" -- "${cur}") )
            return 0
            ;;
        --adapter|-a)
            COMPREPLY=( $(compgen -W "claude cursor copilot generic" -- "${cur}") )
            return 0
            ;;
        --language|-l)
            COMPREPLY=( $(compgen -W "en ru es zh de fr ja ko pt" -- "${cur}") )
            return 0
            ;;
    esac

    # Handle options
    if [[ "${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "--help" -- "${cur}") )
        return 0
    fi

    return 0
}

complete -F _specweave_completions specweave
