#!/bin/bash
# Auto-generated cleanup commands for duplicate GitHub issues
# Generated: $(date)
#
# IMPORTANT: Review these commands before running!
# This script will close duplicate issues on GitHub.

set -e

REPO="anton-abyzov/specweave"

echo "🚀 Starting GitHub issue cleanup..."
echo ""
echo "⚠️  This will close duplicate issues!"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi
echo ""


# Close duplicate: [FS-25-10-24] Core Framework Enhancements - Multi-Tool Support & Diagram Agents
echo "Closing #302..."
gh issue close 302 --repo "$REPO" --comment "Closing duplicate issue. Keeping #296 as canonical issue for [FS-25-10-24] Core Framework Enhancements ."


# Close duplicate: [FS-25-10-24] Core Framework Enhancements - Multi-Tool Support & Diagram Agents
echo "Closing #331..."
gh issue close 331 --repo "$REPO" --comment "Closing duplicate issue. Keeping #302 as canonical issue for [FS-25-10-24] Core Framework Enhancements ."


# Close duplicate: [FS-25-10-29] Intelligent Model Selection - Automatic Cost Optimization
echo "Closing #303..."
gh issue close 303 --repo "$REPO" --comment "Closing duplicate issue. Keeping #297 as canonical issue for [FS-25-10-29] Intelligent Model Selection ."


# Close duplicate: [FS-25-10-29] Intelligent Model Selection - Automatic Cost Optimization
echo "Closing #333..."
gh issue close 333 --repo "$REPO" --comment "Closing duplicate issue. Keeping #303 as canonical issue for [FS-25-10-29] Intelligent Model Selection ."


# Close duplicate: [FS-25-11-03] DORA Metrics MVP
echo "Closing #305..."
gh issue close 305 --repo "$REPO" --comment "Closing duplicate issue. Keeping #299 as canonical issue for [FS-25-11-03] DORA Metrics MVP."


# Close duplicate: [FS-25-11-03] DORA Metrics MVP
echo "Closing #335..."
gh issue close 335 --repo "$REPO" --comment "Closing duplicate issue. Keeping #305 as canonical issue for [FS-25-11-03] DORA Metrics MVP."


# Close duplicate: [FS-25-11-03] Increment Specification: Cross-Platform CLI Support
echo "Closing #304..."
gh issue close 304 --repo "$REPO" --comment "Closing duplicate issue. Keeping #298 as canonical issue for [FS-25-11-03] Increment Specification: Cross."


# Close duplicate: [FS-25-11-03] Increment Specification: Cross-Platform CLI Support
echo "Closing #334..."
gh issue close 334 --repo "$REPO" --comment "Closing duplicate issue. Keeping #304 as canonical issue for [FS-25-11-03] Increment Specification: Cross."


# Close duplicate: [FS-25-11-03] Intelligent Reopen Logic with Automatic Detection
echo "Closing #306..."
gh issue close 306 --repo "$REPO" --comment "Closing duplicate issue. Keeping #300 as canonical issue for [FS-25-11-03] Intelligent Reopen Logic with Automatic Detection."


# Close duplicate: [FS-25-11-03] Intelligent Reopen Logic with Automatic Detection
echo "Closing #336..."
gh issue close 336 --repo "$REPO" --comment "Closing duplicate issue. Keeping #306 as canonical issue for [FS-25-11-03] Intelligent Reopen Logic with Automatic Detection."


# Close duplicate: [FS-25-11-03] Product Specification: Plugin Architecture
echo "Closing #338..."
gh issue close 338 --repo "$REPO" --comment "Closing duplicate issue. Keeping #308 as canonical issue for [FS-25-11-03] Product Specification: Plugin Architecture."


# Close duplicate: [FS-25-11-03] Spec: Increment Management v2.0 (0007)
echo "Closing #339..."
gh issue close 339 --repo "$REPO" --comment "Closing duplicate issue. Keeping #309 as canonical issue for [FS-25-11-03] Spec: Increment Management v2.0 (0007)."


# Close duplicate: [FS-25-11-03] Specification: LLM-Native Multilingual Support
echo "Closing #307..."
gh issue close 307 --repo "$REPO" --comment "Closing duplicate issue. Keeping #301 as canonical issue for [FS-25-11-03] Specification: LLM."


# Close duplicate: [FS-25-11-03] Specification: LLM-Native Multilingual Support
echo "Closing #337..."
gh issue close 337 --repo "$REPO" --comment "Closing duplicate issue. Keeping #307 as canonical issue for [FS-25-11-03] Specification: LLM."


# Close duplicate: [FS-25-11-03] User Education & FAQ Implementation
echo "Closing #340..."
gh issue close 340 --repo "$REPO" --comment "Closing duplicate issue. Keeping #310 as canonical issue for [FS-25-11-03] User Education & FAQ Implementation."


# Close duplicate: [FS-25-11-04] Multi-Project Sync Architecture
echo "Closing #342..."
gh issue close 342 --repo "$REPO" --comment "Closing duplicate issue. Keeping #312 as canonical issue for [FS-25-11-04] Multi."


# Close duplicate: [FS-25-11-04] Proactive Plugin Validation System
echo "Closing #343..."
gh issue close 343 --repo "$REPO" --comment "Closing duplicate issue. Keeping #313 as canonical issue for [FS-25-11-04] Proactive Plugin Validation System."


# Close duplicate: [FS-25-11-04] Specification: Multi-Project Internal Docs & Brownfield Import
echo "Closing #341..."
gh issue close 341 --repo "$REPO" --comment "Closing duplicate issue. Keeping #311 as canonical issue for [FS-25-11-04] Specification: Multi."


# Close duplicate: [FS-25-11-05] v0.8.0 Stabilization & Test Coverage
echo "Closing #344..."
gh issue close 344 --repo "$REPO" --comment "Closing duplicate issue. Keeping #314 as canonical issue for [FS-25-11-05] v0.8.0 Stabilization & Test Coverage."


# Close duplicate: [FS-25-11-09] AI Self-Reflection System
echo "Closing #348..."
gh issue close 348 --repo "$REPO" --comment "Closing duplicate issue. Keeping #317 as canonical issue for [FS-25-11-09] AI Self."


# Close duplicate: [FS-25-11-09] Fix Sync Architecture Prompts
echo "Closing #350..."
gh issue close 350 --repo "$REPO" --comment "Closing duplicate issue. Keeping #319 as canonical issue for [FS-25-11-09] Fix Sync Architecture Prompts."


# Close duplicate: [FS-25-11-09] Hierarchical External Sync
echo "Closing #345..."
gh issue close 345 --repo "$REPO" --comment "Closing duplicate issue. Keeping #315 as canonical issue for [FS-25-11-09] Hierarchical External Sync."


# Close duplicate: [FS-25-11-09] Jira Init Configuration & Messaging Improvements
echo "Closing #347..."
gh issue close 347 --repo "$REPO" --comment "Closing duplicate issue. Keeping #316 as canonical issue for [FS-25-11-09] Jira Init Configuration & Messaging Improvements."


# Close duplicate: [FS-25-11-09] Strict Increment Discipline Enforcement
echo "Closing #349..."
gh issue close 349 --repo "$REPO" --comment "Closing duplicate issue. Keeping #318 as canonical issue for [FS-25-11-09] Strict Increment Discipline Enforcement."


# Close duplicate: [FS-25-11-10] Bidirectional Spec Sync
echo "Closing #351..."
gh issue close 351 --repo "$REPO" --comment "Closing duplicate issue. Keeping #320 as canonical issue for [FS-25-11-10] Bidirectional Spec Sync."


# Close duplicate: [FS-25-11-10] E2E Test Cleanup and Fix
echo "Closing #352..."
gh issue close 352 --repo "$REPO" --comment "Closing duplicate issue. Keeping #321 as canonical issue for [FS-25-11-10] E2E Test Cleanup and Fix."


# Close duplicate: [FS-25-11-10] Multi-Repo Unit Test Coverage Gap
echo "Closing #353..."
gh issue close 353 --repo "$REPO" --comment "Closing duplicate issue. Keeping #322 as canonical issue for [FS-25-11-10] Multi."


# Close duplicate: [FS-25-11-10] Per Project Resource Config
echo "Closing #354..."
gh issue close 354 --repo "$REPO" --comment "Closing duplicate issue. Keeping #323 as canonical issue for [FS-25-11-10] Per Project Resource Config."


# Close duplicate: [FS-25-11-10] Release Management Plugin Enhancements
echo "Closing #355..."
gh issue close 355 --repo "$REPO" --comment "Closing duplicate issue. Keeping #324 as canonical issue for [FS-25-11-10] Release Management Plugin Enhancements."


# Close duplicate: [FS-25-11-11] Enhanced Multi-Repository GitHub Support
echo "Closing #356..."
gh issue close 356 --repo "$REPO" --comment "Closing duplicate issue. Keeping #325 as canonical issue for [FS-25-11-11] Enhanced Multi."


# Close duplicate: [FS-25-11-11] Intelligent Living Docs Sync
echo "Closing #357..."
gh issue close 357 --repo "$REPO" --comment "Closing duplicate issue. Keeping #326 as canonical issue for [FS-25-11-11] Intelligent Living Docs Sync."


# Close duplicate: [FS-25-11-11] Multi-Repository Initialization UX Improvements
echo "Closing #358..."
gh issue close 358 --repo "$REPO" --comment "Closing duplicate issue. Keeping #327 as canonical issue for [FS-25-11-11] Multi."


# Close duplicate: [FS-25-11-11] Multi-Repository Setup UX Improvements
echo "Closing #328..."
gh issue close 328 --repo "$REPO" --comment "Closing duplicate issue. Keeping #358 as canonical issue for [FS-25-11-11] Multi."


# Close duplicate: [FS-25-11-11] Multi-Repository Setup UX Improvements
echo "Closing #359..."
gh issue close 359 --repo "$REPO" --comment "Closing duplicate issue. Keeping #328 as canonical issue for [FS-25-11-11] Multi."


# Close duplicate: [FS-25-11-12] External Tool Status Synchronization
echo "Closing #360..."
gh issue close 360 --repo "$REPO" --comment "Closing duplicate issue. Keeping #329 as canonical issue for [FS-25-11-12] External Tool Status Synchronization."


# Close duplicate: [FS-25-11-12] Multi-Project GitHub Sync
echo "Closing #361..."
gh issue close 361 --repo "$REPO" --comment "Closing duplicate issue. Keeping #330 as canonical issue for [FS-25-11-12] Multi."


# Close duplicate increment: [INC-0031] External Tool Status Synchronization
echo "Closing #346..."
gh issue close 346 --repo "$REPO" --comment "Closing duplicate increment issue. Keeping #332 as canonical issue."


# Close duplicate increment: [INC-0031] External Tool Status Synchronization
echo "Closing #362..."
gh issue close 362 --repo "$REPO" --comment "Closing duplicate increment issue. Keeping #346 as canonical issue."


# Close duplicate increment: [INC-0031] External Tool Status Synchronization
echo "Closing #363..."
gh issue close 363 --repo "$REPO" --comment "Closing duplicate increment issue. Keeping #362 as canonical issue."


# Close duplicate increment: [INC-0031] External Tool Status Synchronization
echo "Closing #364..."
gh issue close 364 --repo "$REPO" --comment "Closing duplicate increment issue. Keeping #363 as canonical issue."


# Close duplicate increment: [INC-0031] External Tool Status Synchronization
echo "Closing #365..."
gh issue close 365 --repo "$REPO" --comment "Closing duplicate increment issue. Keeping #364 as canonical issue."


echo ""
echo "✅ Cleanup complete!"
echo "📊 Total issues closed: $CLOSE_COUNT"
echo ""
