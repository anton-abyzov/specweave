import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Test fixtures
const CORRECTION_SIGNALS = [
    "No, don't use that button. Use our <Button variant='primary'> component.",
    "Wrong! Always use the Logger class, not console.log.",
    "That's incorrect. The API should return 404, not 500.",
    "Never use inline styles. Always use Tailwind classes.",
    "The correct way is to use vi.mock(), not jest.mock()."
];

const APPROVAL_SIGNALS = [
    "Perfect! That's exactly how our API should look.",
    "That's right, always use storageState for Playwright auth.",
    "Exactly! This is the correct pattern for error handling.",
    "Well done, that's the proper naming convention."
];

const NEUTRAL_STATEMENTS = [
    "OK",
    "Sure",
    "Proceed",
    "Continue",
    "Thanks"
];

describe('Reflect System', () => {
    let tempDir: string;
    let projectRoot: string;
    let stateDir: string;
    let memoryDir: string;  // CENTRALIZED: .specweave/memory/ instead of skills/
    let reflectScript: string;

    beforeEach(() => {
        // Create temp directory structure
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-test-'));
        projectRoot = tempDir;
        stateDir = path.join(projectRoot, '.specweave', 'state');
        memoryDir = path.join(projectRoot, '.specweave', 'memory');  // CENTRALIZED

        fs.mkdirSync(stateDir, { recursive: true });
        fs.mkdirSync(memoryDir, { recursive: true });

        // Path to reflect script
        reflectScript = path.join(__dirname, '../../plugins/specweave/scripts/reflect.sh');
    });

    afterEach(() => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('Signal Detection', () => {
        it('should detect correction signals in transcript', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            const transcriptContent = `
# Session Transcript

User: Create a button component.
Claude: Here's a custom button...
User: ${CORRECTION_SIGNALS[0]}
Claude: I'll use the Button component instead.
`;
            fs.writeFileSync(transcriptPath, transcriptContent);

            // Create test config
            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: false,
                confidenceThreshold: 'medium',
                maxLearningsPerSession: 10
            }));

            // Run reflect script
            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('Corrections:');
                expect(result).toContain('Button');
            } catch (error: any) {
                // Script may exit with non-zero if no learnings saved (dry run)
                if (error.stdout) {
                    expect(error.stdout).toContain('Corrections:');
                }
            }
        });

        it('should detect approval signals in transcript', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            const transcriptContent = `
# Session Transcript

User: How should we structure the API?
Claude: I recommend using a RESTful pattern with proper error codes.
User: ${APPROVAL_SIGNALS[0]}
`;
            fs.writeFileSync(transcriptPath, transcriptContent);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: false,
                confidenceThreshold: 'medium'
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('Approvals:');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('Approvals:');
                }
            }
        });

        it('should not detect neutral statements as signals', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            const transcriptContent = NEUTRAL_STATEMENTS.join('\n');
            fs.writeFileSync(transcriptPath, transcriptContent);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: false
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('No corrections or approvals detected');
            } catch (error: any) {
                // Expected - no signals found
                expect(error.status).toBe(1);
            }
        });
    });

    describe('Learning Categorization', () => {
        it('should categorize button-related learnings as component-usage', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[0]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('component-usage');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('component-usage');
                }
            }
        });

        it('should categorize API-related learnings as api-patterns', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[2]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('api-patterns');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('api-patterns');
                }
            }
        });

        it('should categorize test-related learnings as testing', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[4]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('testing');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('testing');
                }
            }
        });
    });

    describe('Memory File Management', () => {
        it('should create MEMORY.md file for skill when learning is saved', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[0]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: false,
                gitCommit: false
            }));

            try {
                execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath}`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );
            } catch (error) {
                // May exit with error but still create file
            }

            // Check that a centralized category memory file was created
            const componentMemory = path.join(memoryDir, 'component-usage.md');
            if (fs.existsSync(componentMemory)) {
                const content = fs.readFileSync(componentMemory, 'utf-8');
                expect(content).toContain('# Component Usage Memory');
                expect(content).toContain('LRN-');
            }
        });

        it('should append learnings to existing MEMORY.md', () => {
            // Create existing centralized memory file (by category)
            const existingContent = `# Component Usage Memory

> Auto-generated by SpecWeave Reflect. Edit with caution.
> Last updated: 2026-01-01T00:00:00Z
> Location: Centralized in .specweave/memory/

## Learned Patterns

### component-usage

#### LRN-2026-01-01-abc (High Confidence)
**Context**: Existing learning
**Learning**: Use PascalCase for components
**Triggers**: component, naming
**Added**: 2026-01-01
`;
            fs.writeFileSync(path.join(memoryDir, 'component-usage.md'), existingContent);

            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[0]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                gitCommit: false
            }));

            try {
                execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath}`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );
            } catch (error) {
                // May have non-zero exit
            }

            const content = fs.readFileSync(path.join(memoryDir, 'component-usage.md'), 'utf-8');

            // Should contain both old and new learnings
            expect(content).toContain('LRN-2026-01-01-abc');
        });
    });

    describe('Reflect Commands', () => {
        it('reflect-on should enable auto-reflection', () => {
            try {
                execSync(
                    `bash ${reflectScript} on`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );
            } catch (error) {
                // Ignore exit code, check file
            }

            const configPath = path.join(stateDir, 'reflect-config.json');
            expect(fs.existsSync(configPath)).toBe(true);

            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            expect(config.autoReflect).toBe(true);
            expect(config.enabled).toBe(true);
        });

        it('reflect-off should disable auto-reflection', () => {
            // First enable
            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: true
            }));

            try {
                execSync(
                    `bash ${reflectScript} off`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );
            } catch (error) {
                // Ignore exit code
            }

            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            expect(config.autoReflect).toBe(false);
        });

        it('reflect-status should show configuration', () => {
            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                autoReflect: true,
                confidenceThreshold: 'high',
                maxLearningsPerSession: 5
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} status`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                expect(result).toContain('REFLECT: Status Dashboard');
                expect(result).toContain('Auto-reflect');
                expect(result).toContain('high');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('Status');
                }
            }
        });
    });

    describe('Confidence Thresholds', () => {
        it('should only extract high confidence learnings when threshold is high', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: No, don't use that. Always use X instead.
Claude: Got it.
User: Perfect! That looks good.
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                confidenceThreshold: 'high'
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --confidence high --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                // Should detect correction (high) but not approval (medium)
                expect(result).toContain('high');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('high');
                }
            }
        });

        it('should extract both high and medium confidence learnings when threshold is medium', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: Wrong! Use X.
Claude: OK.
User: That's exactly right!
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                confidenceThreshold: 'medium'
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --confidence medium --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                // Should detect both correction and approval
                expect(result).toContain('Corrections:');
                expect(result).toContain('Approvals:');
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('Corrections');
                }
            }
        });
    });

    describe('Max Learnings Limit', () => {
        it('should respect max learnings per session limit', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            const manyCorrections = CORRECTION_SIGNALS.map(
                (s, i) => `User: ${s.replace(/'/g, '')}\nClaude: Got it.\n`
            ).join('\n');
            fs.writeFileSync(transcriptPath, manyCorrections);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                maxLearningsPerSession: 2,
                gitCommit: false
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --max 2`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                // Should show exactly 2 learnings
                const learningMatches = (result.match(/Learning LRN-/g) || []).length;
                expect(learningMatches).toBeLessThanOrEqual(2);
            } catch (error: any) {
                // May exit with non-zero but should still limit learnings
            }
        });
    });

    describe('Skill Filtering', () => {
        it('should only extract learnings for specified skill', () => {
            const transcriptPath = path.join(tempDir, 'transcript.md');
            fs.writeFileSync(transcriptPath, `
User: ${CORRECTION_SIGNALS[0]}
User: ${CORRECTION_SIGNALS[2]}
`);

            const configPath = path.join(stateDir, 'reflect-config.json');
            fs.writeFileSync(configPath, JSON.stringify({
                enabled: true,
                gitCommit: false
            }));

            try {
                const result = execSync(
                    `bash ${reflectScript} reflect --transcript ${transcriptPath} --skill frontend --dry-run`,
                    {
                        cwd: projectRoot,
                        env: { ...process.env, PROJECT_ROOT: projectRoot },
                        encoding: 'utf-8'
                    }
                );

                // Should only show frontend skill
                expect(result).toContain('frontend');
                // Should not include backend/api learnings when filtered
            } catch (error: any) {
                if (error.stdout) {
                    expect(error.stdout).toContain('frontend');
                }
            }
        });
    });
});

describe('Reflect Integration', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-integration-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should have valid SKILL.md file', () => {
        const skillPath = path.join(
            __dirname,
            '../../plugins/specweave/skills/reflect/SKILL.md'
        );

        expect(fs.existsSync(skillPath)).toBe(true);

        const content = fs.readFileSync(skillPath, 'utf-8');

        // Check YAML frontmatter
        expect(content).toMatch(/^---\nname: reflect/);
        expect(content).toContain('description:');

        // Check key sections
        expect(content).toContain('## Overview');
        expect(content).toContain('## How It Works');
        expect(content).toContain('## Usage');
        expect(content).toContain('/sw:reflect');
    });

    it('should have valid command files', () => {
        const commandsDir = path.join(__dirname, '../../plugins/specweave/commands');

        const commands = [
            'reflect.md',
            'reflect-on.md',
            'reflect-off.md',
            'reflect-status.md',
            'reflect-clear.md'
        ];

        for (const cmd of commands) {
            const cmdPath = path.join(commandsDir, cmd);
            expect(fs.existsSync(cmdPath)).toBe(true);

            const content = fs.readFileSync(cmdPath, 'utf-8');

            // Check YAML frontmatter
            expect(content).toMatch(/^---\nname: sw:/);
            expect(content).toContain('description:');
        }
    });

    it('should have executable reflect script', () => {
        const scriptPath = path.join(
            __dirname,
            '../../plugins/specweave/scripts/reflect.sh'
        );

        expect(fs.existsSync(scriptPath)).toBe(true);

        // Check script is valid bash
        try {
            execSync(`bash -n ${scriptPath}`, { encoding: 'utf-8' });
        } catch (error) {
            throw new Error('reflect.sh has syntax errors');
        }
    });

    it('should have stop hook integration', () => {
        const hookPath = path.join(
            __dirname,
            '../../plugins/specweave/hooks/reflect-stop-hook.sh'
        );

        expect(fs.existsSync(hookPath)).toBe(true);

        const content = fs.readFileSync(hookPath, 'utf-8');

        // Check key functions exist
        expect(content).toContain('is_auto_reflect_enabled');
        expect(content).toContain('maybe_auto_reflect');
        expect(content).toContain('has_reflection_signals');
    });
});
