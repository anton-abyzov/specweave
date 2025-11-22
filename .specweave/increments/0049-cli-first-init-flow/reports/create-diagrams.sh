#!/bin/bash

# Create diagram directory
mkdir -p /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/architecture/diagrams/init-flow

# Create sequence diagram
cat > /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/architecture/diagrams/init-flow/init-flow-sequence.mmd << 'EOF'
sequenceDiagram
    participant User
    participant CLI as CLI (init command)
    participant Counter as ProjectCountFetcher
    participant Strategy as InitStrategyPrompt
    participant Async as AsyncProjectFetcher
    participant Checkbox as CheckboxSelector
    participant Manual as ManualEntryPrompt
    participant FileSystem as FileSystem

    User->>CLI: specweave init
    CLI->>CLI: Validate credentials (fast auth check)

    Note over CLI,Counter: Phase 1: Quick Count Check
    CLI->>Counter: fetchProjectCount()
    Counter->>Counter: GET /api/project/search?maxResults=0
    Counter-->>CLI: Total: 127 projects

    Note over CLI,Strategy: Phase 2: Upfront Strategy Choice
    CLI->>Strategy: promptStrategy(127)
    Strategy->>User: Display 3 choices:<br/>1. ✨ Import all 127 (recommended)<br/>2. 📋 Select specific<br/>3. ✏️ Manual entry
    User-->>Strategy: Choice: "Import all"

    alt Import All Strategy
        Note over Strategy,Async: Phase 3a: Async Batch Fetch
        Strategy->>Async: fetchAllProjects(127)

        loop For each batch (50 projects)
            Async->>Async: GET /api/project/search?startAt={offset}&maxResults=50
            Async->>User: Progress: 50/127 (39%)

            alt User presses Ctrl+C
                User->>Async: SIGINT
                Async->>Async: Save state to cache/import-state.json
                Async->>User: "Imported 50/127. Run --resume to continue"
                Async-->>CLI: Partial state
            end
        end

        Async-->>Strategy: All 127 projects

    else Select Specific Strategy
        Note over Strategy,Checkbox: Phase 3b: Checkbox Selection
        Strategy->>Checkbox: loadFirst50Projects()
        Checkbox->>Checkbox: GET /api/project/search?maxResults=50
        Checkbox->>User: Display checkboxes (ALL CHECKED by default)
        User->>User: Deselect 5 unwanted projects
        User-->>Checkbox: Selected: 45 projects
        Checkbox-->>Strategy: 45 projects

    else Manual Entry Strategy
        Note over Strategy,Manual: Phase 3c: Manual Entry
        Strategy->>Manual: promptManualEntry()
        Manual->>User: Enter comma-separated keys:
        User-->>Manual: "BACKEND,FRONTEND,MOBILE"
        Manual->>Manual: Validate keys (API check)
        Manual-->>Strategy: 3 projects
    end

    Note over Strategy,FileSystem: Phase 4: Create Project Folders
    Strategy->>FileSystem: Create .specweave/docs/internal/projects/{key}/
    FileSystem-->>Strategy: Folders created

    Strategy->>FileSystem: Save to .specweave/config.json
    FileSystem-->>Strategy: Config saved

    CLI->>User: ✅ Init complete! (< 30 seconds)
EOF

# Create smart pagination architecture diagram
cat > /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/architecture/diagrams/init-flow/smart-pagination-architecture.mmd << 'EOF'
flowchart TD
    Start([User runs specweave init]) --> ValidateCreds[Validate Credentials<br/>Fast auth check]

    ValidateCreds --> FetchCount[ProjectCountFetcher<br/>GET /api?maxResults=0<br/>Returns: total count only]

    FetchCount --> DisplayCount[Display Total Count<br/>'Found 127 accessible projects']

    DisplayCount --> PromptStrategy{InitStrategyPrompt<br/>3 Choices}

    PromptStrategy -->|1. Import All<br/>Recommended| ImportAll[AsyncProjectFetcher<br/>Batch size: 50]
    PromptStrategy -->|2. Select Specific<br/>Interactive| SelectSpecific[CheckboxSelector<br/>Load first 50]
    PromptStrategy -->|3. Manual Entry<br/>1-2 projects| ManualEntry[ManualEntryPrompt<br/>Comma-separated]

    ImportAll --> BatchLoop{More batches?}
    BatchLoop -->|Yes| FetchBatch[Fetch Next Batch<br/>API: startAt={offset}, maxResults=50]
    FetchBatch --> UpdateProgress[Update Progress<br/>N/M projects, percentage, ETA]
    UpdateProgress --> CheckCancel{Ctrl+C pressed?}
    CheckCancel -->|No| BatchLoop
    CheckCancel -->|Yes| SaveState[Save Partial State<br/>cache/import-state.json]
    SaveState --> ShowResume[Show Resume Command<br/>/specweave-jira:import --resume]
    ShowResume --> End2([Partial Init Complete])

    BatchLoop -->|No| AllFetched[All Projects Fetched<br/>127/127 complete]

    SelectSpecific --> LoadFirst50[Load First 50 Projects<br/>With metadata]
    LoadFirst50 --> ShowCheckboxes[Show Checkboxes<br/>ALL CHECKED by default]
    ShowCheckboxes --> UserDeselects[User Deselects<br/>Unwanted 5 projects]
    UserDeselects --> SelectedProjects[45 Projects Selected]

    ManualEntry --> PromptKeys[Prompt for Keys<br/>'BACKEND,FRONTEND,MOBILE']
    PromptKeys --> ValidateKeys[Validate Keys<br/>API existence check]
    ValidateKeys --> ParsedProjects[3 Projects Validated]

    AllFetched --> CreateFolders
    SelectedProjects --> CreateFolders
    ParsedProjects --> CreateFolders

    CreateFolders[Create Project Folders<br/>.specweave/docs/internal/projects/{key}/]
    CreateFolders --> SaveConfig[Save Configuration<br/>.specweave/config.json]

    SaveConfig --> ShowSummary[Show Summary<br/>Succeeded/Failed/Skipped counts]
    ShowSummary --> End([✅ Init Complete<br/>< 30 seconds elapsed])

    style ImportAll fill:#e1f5e1
    style SelectSpecific fill:#fff3cd
    style ManualEntry fill:#f8d7da
    style CreateFolders fill:#cfe2ff
    style End fill:#d1ecf1
    style End2 fill:#f8d7da

    classDef criticalPath fill:#e1f5e1,stroke:#28a745,stroke-width:3px
    class FetchCount,ImportAll,BatchLoop,AllFetched,CreateFolders criticalPath
EOF

echo "✅ Diagrams created successfully!"
echo "   - init-flow-sequence.mmd"
echo "   - smart-pagination-architecture.mmd"
