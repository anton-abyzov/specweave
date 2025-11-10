/**
 * Reflection Parser
 *
 * Parses markdown output from reflective-reviewer agent
 * Extracts structured data (issues, metrics, lessons learned, etc.)
 *
 * @module reflection-parser
 */
import { IssueSeverity, IssueCategory, ReflectionModel } from './types/reflection-types';
/**
 * Extract section content by heading
 * @param markdown Markdown content
 * @param heading Section heading to find (e.g., "## What Was Accomplished")
 * @returns Section content (text after heading until next heading or end)
 */
function extractSection(markdown, heading) {
    const headingRegex = new RegExp(`^${heading}\\s*$`, 'mi');
    const match = markdown.match(headingRegex);
    if (!match || match.index === undefined) {
        return '';
    }
    const startIndex = match.index + match[0].length;
    const afterHeading = markdown.slice(startIndex);
    // Find next heading at same or higher level
    const nextHeadingMatch = afterHeading.match(/^#{1,3}\s+/m);
    const endIndex = nextHeadingMatch?.index ?? afterHeading.length;
    return afterHeading.slice(0, endIndex).trim();
}
/**
 * Parse accomplishments from "What Was Accomplished" section
 * @param markdown Reflection markdown
 * @returns Array of accomplishment strings
 */
function parseAccomplishments(markdown) {
    const section = extractSection(markdown, '## ✅ What Was Accomplished');
    if (!section)
        return [];
    // Extract bullet points and paragraphs
    const lines = section.split('\n').filter(line => line.trim());
    const accomplishments = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Match bullet points (-, *, +) or numbered lists (1., 2.)
        if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
            accomplishments.push(trimmed.replace(/^[-*+\d.]\s+/, '').trim());
        }
        else if (trimmed.length > 10 && !trimmed.startsWith('#')) {
            // Include non-heading paragraphs
            accomplishments.push(trimmed);
        }
    }
    return accomplishments;
}
/**
 * Parse strengths from "Quality Assessment" section
 * @param markdown Reflection markdown
 * @returns Array of strength strings
 */
function parseStrengths(markdown) {
    const section = extractSection(markdown, '### ✅ Strengths');
    if (!section)
        return [];
    const lines = section.split('\n').filter(line => line.trim());
    const strengths = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ✅') || trimmed.startsWith('✅')) {
            strengths.push(trimmed.replace(/^[-*+]?\s*✅\s*/, '').trim());
        }
    }
    return strengths;
}
/**
 * Parse severity from issue description
 * @param text Issue text (e.g., "**CRITICAL (SECURITY)**")
 * @returns Issue severity enum or undefined
 */
function parseSeverity(text) {
    if (/CRITICAL/i.test(text))
        return IssueSeverity.CRITICAL;
    if (/HIGH/i.test(text))
        return IssueSeverity.HIGH;
    if (/MEDIUM/i.test(text))
        return IssueSeverity.MEDIUM;
    if (/LOW/i.test(text))
        return IssueSeverity.LOW;
    return undefined;
}
/**
 * Parse category from issue description
 * @param text Issue text (e.g., "**CRITICAL (SECURITY)**")
 * @returns Issue category enum or undefined
 */
function parseCategory(text) {
    if (/SECURITY/i.test(text))
        return IssueCategory.SECURITY;
    if (/QUALITY/i.test(text))
        return IssueCategory.QUALITY;
    if (/TESTING/i.test(text))
        return IssueCategory.TESTING;
    if (/PERFORMANCE/i.test(text))
        return IssueCategory.PERFORMANCE;
    if (/TECHNICAL[_\s]DEBT/i.test(text))
        return IssueCategory.TECHNICAL_DEBT;
    return undefined;
}
/**
 * Parse location from issue text
 * @param text Issue text (may contain **Location**: `path/to/file.ts:123`)
 * @returns Location object or undefined
 */
function parseLocation(text) {
    // Match: **Location**: `path/to/file.ts:123`
    const locationMatch = text.match(/\*\*Location\*\*:\s*`([^`]+)`/i);
    if (!locationMatch)
        return undefined;
    const locationStr = locationMatch[1];
    const [file, lineStr] = locationStr.split(':');
    const line = lineStr ? parseInt(lineStr, 10) : undefined;
    return {
        file: file.trim(),
        line
    };
}
/**
 * Parse issues from "Issues Identified" section
 * @param markdown Reflection markdown
 * @returns Array of ReflectionIssue objects
 */
function parseIssues(markdown) {
    const section = extractSection(markdown, '### ⚠️ Issues Identified');
    if (!section)
        return [];
    const issues = [];
    const lines = section.split('\n');
    let currentIssue = null;
    let currentField = null;
    for (const line of lines) {
        const trimmed = line.trim();
        // Check for severity/category header (e.g., "**CRITICAL (SECURITY)**")
        const headerMatch = trimmed.match(/^\*\*(CRITICAL|HIGH|MEDIUM|LOW)\s*\(([^)]+)\)\*\*/i);
        if (headerMatch) {
            // Save previous issue
            if (currentIssue && currentIssue.severity && currentIssue.category && currentIssue.description) {
                issues.push(currentIssue);
            }
            // Start new issue
            currentIssue = {
                severity: parseSeverity(headerMatch[1]),
                category: parseCategory(headerMatch[2]),
                description: '',
                impact: '',
                recommendation: ''
            };
            currentField = null;
            continue;
        }
        // Check for issue bullet point (❌ or ⚠️)
        if ((trimmed.startsWith('- ❌') || trimmed.startsWith('❌') || trimmed.startsWith('- ⚠️')) && currentIssue) {
            currentField = 'description';
            const descText = trimmed.replace(/^[-*+]?\s*[❌⚠️]\s*/, '').trim();
            currentIssue.description = descText;
            continue;
        }
        // Check for Impact field
        if (trimmed.startsWith('- **Impact**:') || trimmed.startsWith('**Impact**:')) {
            currentField = 'impact';
            const impactText = trimmed.replace(/^[-*+]?\s*\*\*Impact\*\*:\s*/, '').trim();
            if (currentIssue)
                currentIssue.impact = impactText;
            continue;
        }
        // Check for Recommendation field
        if (trimmed.startsWith('- **Recommendation**:') || trimmed.startsWith('**Recommendation**:')) {
            currentField = 'recommendation';
            const recText = trimmed.replace(/^[-*+]?\s*\*\*Recommendation\*\*:\s*/, '').trim();
            if (currentIssue)
                currentIssue.recommendation = recText;
            continue;
        }
        // Check for Location field
        if (trimmed.startsWith('- **Location**:') || trimmed.startsWith('**Location**:')) {
            if (currentIssue) {
                const location = parseLocation(trimmed);
                if (location)
                    currentIssue.location = location;
            }
            currentField = null;
            continue;
        }
        // Append continuation lines to current field
        if (currentField && currentIssue && trimmed && !trimmed.startsWith('#')) {
            const fieldValue = currentIssue[currentField] || '';
            currentIssue[currentField] = fieldValue + ' ' + trimmed;
        }
    }
    // Save last issue
    if (currentIssue && currentIssue.severity && currentIssue.category && currentIssue.description) {
        issues.push(currentIssue);
    }
    return issues;
}
/**
 * Parse recommended actions from "Recommended Follow-Up Actions" section
 * @param markdown Reflection markdown
 * @returns Recommended actions object with priority levels
 */
function parseRecommendedActions(markdown) {
    const section = extractSection(markdown, '## 🔧 Recommended Follow-Up Actions');
    const actions = {
        priority1: [],
        priority2: [],
        priority3: []
    };
    if (!section)
        return actions;
    const lines = section.split('\n');
    let currentPriority = null;
    for (const line of lines) {
        const trimmed = line.trim();
        // Check for priority headers
        if (/Priority 1|MUST FIX/i.test(trimmed)) {
            currentPriority = 'priority1';
            continue;
        }
        if (/Priority 2|SHOULD FIX/i.test(trimmed)) {
            currentPriority = 'priority2';
            continue;
        }
        if (/Priority 3|NICE TO HAVE/i.test(trimmed)) {
            currentPriority = 'priority3';
            continue;
        }
        // Parse action items (numbered or bulleted)
        if (currentPriority && (/^\d+\.\s/.test(trimmed) || /^[-*+]\s/.test(trimmed))) {
            const actionText = trimmed.replace(/^(\d+\.|-|\*|\+)\s+/, '').trim();
            if (actionText.length > 0) {
                actions[currentPriority].push(actionText);
            }
        }
    }
    return actions;
}
/**
 * Parse lessons learned from "Lessons Learned" section
 * @param markdown Reflection markdown
 * @returns LessonLearned object
 */
function parseLessonsLearned(markdown) {
    const section = extractSection(markdown, '## 📚 Lessons Learned');
    const lessons = {
        whatWentWell: [],
        whatCouldImprove: [],
        forNextTime: []
    };
    if (!section)
        return lessons;
    const lines = section.split('\n');
    let currentCategory = null;
    for (const line of lines) {
        const trimmed = line.trim();
        // Check for category headers
        if (/What went well/i.test(trimmed)) {
            currentCategory = 'whatWentWell';
            continue;
        }
        if (/What could improve/i.test(trimmed)) {
            currentCategory = 'whatCouldImprove';
            continue;
        }
        if (/For next time/i.test(trimmed)) {
            currentCategory = 'forNextTime';
            continue;
        }
        // Parse bullet points
        if (currentCategory && /^[-*+]\s/.test(trimmed)) {
            const text = trimmed.replace(/^[-*+]\s+/, '').trim();
            if (text.length > 0) {
                lessons[currentCategory].push(text);
            }
        }
    }
    return lessons;
}
/**
 * Parse metrics from "Metrics" section
 * @param markdown Reflection markdown
 * @returns ReflectionMetrics object
 */
function parseMetrics(markdown) {
    const section = extractSection(markdown, '## 📊 Metrics');
    const metrics = {
        codeQuality: 5,
        security: 5,
        testCoverage: undefined,
        technicalDebt: 'MEDIUM',
        performance: 'ACCEPTABLE'
    };
    if (!section)
        return metrics;
    // Parse Code Quality (1-10)
    const qualityMatch = section.match(/Code Quality.*?(\d+)/i);
    if (qualityMatch) {
        metrics.codeQuality = parseInt(qualityMatch[1], 10);
    }
    // Parse Security (1-10)
    const securityMatch = section.match(/Security.*?(\d+)/i);
    if (securityMatch) {
        metrics.security = parseInt(securityMatch[1], 10);
    }
    // Parse Test Coverage (percentage)
    const coverageMatch = section.match(/Test Coverage.*?(\d+)%/i);
    if (coverageMatch) {
        metrics.testCoverage = parseInt(coverageMatch[1], 10);
    }
    // Parse Technical Debt (LOW/MEDIUM/HIGH)
    const debtMatch = section.match(/Technical Debt.*?(LOW|MEDIUM|HIGH)/i);
    if (debtMatch) {
        metrics.technicalDebt = debtMatch[1].toUpperCase();
    }
    // Parse Performance (GOOD/ACCEPTABLE/NEEDS WORK)
    const perfMatch = section.match(/Performance.*?(GOOD|ACCEPTABLE|NEEDS[\s_]WORK)/i);
    if (perfMatch) {
        metrics.performance = perfMatch[1].toUpperCase().replace(/[\s_]/g, '_');
    }
    return metrics;
}
/**
 * Parse complete reflection result from markdown
 * Main parsing function
 *
 * @param markdown Reflection markdown from reflective-reviewer agent
 * @param taskName Task name for result
 * @param model Model used for reflection
 * @param reflectionTime Time taken in seconds
 * @param estimatedCost Estimated cost in USD
 * @returns Complete ReflectionResult object
 */
export function parseReflectionMarkdown(markdown, taskName, model = ReflectionModel.HAIKU, reflectionTime = 0, estimatedCost = 0) {
    const result = {
        taskName,
        completed: new Date().toISOString(),
        duration: reflectionTime > 0 ? `${reflectionTime}s` : undefined,
        filesModified: {
            count: 0,
            linesAdded: 0,
            linesRemoved: 0
        },
        accomplishments: parseAccomplishments(markdown),
        strengths: parseStrengths(markdown),
        issues: parseIssues(markdown),
        recommendedActions: parseRecommendedActions(markdown),
        lessonsLearned: parseLessonsLearned(markdown),
        metrics: parseMetrics(markdown),
        metadata: {
            model,
            reflectionTime,
            estimatedCost
        }
    };
    // Extract file modification stats from markdown if present
    const filesChangedMatch = markdown.match(/\*\*Files Modified\*\*:\s*(\d+)\s*files?,\s*\+(\d+)\s*-(\d+)/i);
    if (filesChangedMatch) {
        result.filesModified = {
            count: parseInt(filesChangedMatch[1], 10),
            linesAdded: parseInt(filesChangedMatch[2], 10),
            linesRemoved: parseInt(filesChangedMatch[3], 10)
        };
    }
    return result;
}
/**
 * Validate parsed reflection result
 * Checks for required fields and data quality
 *
 * @param result Parsed reflection result
 * @returns Validation result with errors
 */
export function validateReflectionResult(result) {
    const errors = [];
    // Check required fields
    if (!result.taskName) {
        errors.push('Missing task name');
    }
    if (!result.completed) {
        errors.push('Missing completion timestamp');
    }
    // Check for meaningful content
    if (result.accomplishments.length === 0 && result.strengths.length === 0) {
        errors.push('No accomplishments or strengths identified (reflection too sparse)');
    }
    // Validate metrics
    if (result.metrics.codeQuality < 1 || result.metrics.codeQuality > 10) {
        errors.push('Code quality must be 1-10');
    }
    if (result.metrics.security < 1 || result.metrics.security > 10) {
        errors.push('Security must be 1-10');
    }
    if (result.metrics.testCoverage !== undefined && (result.metrics.testCoverage < 0 || result.metrics.testCoverage > 100)) {
        errors.push('Test coverage must be 0-100%');
    }
    // Validate issues have required fields
    for (const issue of result.issues) {
        if (!issue.description) {
            errors.push('Issue missing description');
        }
        if (!issue.impact) {
            errors.push('Issue missing impact explanation');
        }
        if (!issue.recommendation) {
            errors.push('Issue missing recommendation');
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=reflection-parser.js.map