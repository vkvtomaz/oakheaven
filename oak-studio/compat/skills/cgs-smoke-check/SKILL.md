---
name: cgs-smoke-check
description: Execute OAKHEAVEN automated tests, inspect coverage and manual critical paths, and report a QA gate. Supports quick --read-only without generated files.
---

# Smoke Check — explicit Codex adapter

Read `oak-studio/CODEX-RUNTIME.md`. This file contains all active phases; old phase
references are historical comparison material, not executable dependencies. Complete
previous workflow: `oak-studio/compat/originals/cgs-smoke-check.md`.

## Inputs and config

`$cgs-smoke-check [sprint|quick] [--platform pc|console|mobile|all] [--read-only]`
Default sprint; quick skips coverage and manual Batch 3, and every verdict names
that reduced scope. Run `python oak-studio/tools/studio.py config`; read effective
JSON and source. Workflow and QA level are distinct. At QA minimal this smoke gate
is optional and FAIL advisory. Standard/full use strict configuration; absent strict
config defaults blocking, valid false advisory, true blocking. Invalid values are
reported, not silently treated as false. NOT ASSESSED never becomes a pass through
advisory configuration.

## 1. Detect setup

Inspect package.json, installed node_modules, actual executable test files under
tests, CI workflows, newest QA plan and smoke lists. Report declared versus actual
engine/commands. No tests at standard/full -> NOT ASSESSED, explain missing setup.
At minimal a missing automated suite may be WAIVED; build/launch/manual paths still need checking.
Do not install dependencies. OAKHEAVEN is Web/PixiJS; other engine runners are
outside this adapter and return NOT ASSESSED instead of guessed commands.

## 2. Automated checks

Read commands before executing. For this repository run `npm test` and
`node node_modules/typescript/bin/tsc --noEmit`. Record command, exit code, test count,
failures and duration. Existing dependencies only. Use tool timeout/session control;
never let an abandoned or timed-out runner count as passing. Zero tests -> NOT
ASSESSED. Nonzero test/compile exit or timeout -> FAIL. Executable unavailable ->
NOT RUN, contributes NOT ASSESSED. Normal runs may also run existing build/smoke
scripts after checking scope; --read-only does not build or write output. A noEmit
compile is a compile check, not a full build or browser launch.

## 3. Coverage

Skip and state why in quick. Otherwise use QA plan then sprint/story files; compare
story criteria with real matching tests and evidence. Mark COVERED, MANUAL, MISSING,
EXPECTED (Config/Data) or UNKNOWN (unreadable story). File existence is not proof
criteria were exercised. MISSING is advisory; UNKNOWN contributes NOT ASSESSED.
No QA plan at minimal is not an invented sprint requirement.

## 4. Manual critical paths

Checklist source priority: QA plan scope, production/qa/smoke-tests.md, tests/smoke,
then standard fallback; name source. Use actual browser tools when possible or ask
user for observed results through the available question interface/plain text.
Never infer pass from silence or an empty failure list. Record provenance.
Batch 1: was current build launched this session, menu/input/start/crash checks.
No launch -> NOT RUN; skip dependent batches, NOT ASSESSED unless known failure.
Batch 2: current mechanic changes and regressions. Batch 3 (except quick): save/load
if implemented, performance and integrity. Performance offered but skipped -> NOT
ASSESSED. Platform flag adds PC keyboard/mouse/window/resolution; console controller,
safe zones/cold start; mobile touch/orientation/background/thermal checks. No target
platform -> NOT ASSESSED for those checks. Do not install or alter game for testing.
In --read-only with no browser, list these as NOT RUN and return partial results;
user confirmation can be collected later without fabricating manual observations.

## 5. Report

Include date, scope, engine/config source, commands/exits/counts, coverage table,
manual checklist source and each check/result/provenance, platform results, missing
evidence, warnings and blockers. Explicitly distinguish compile from build/runtime.
Verdict precedence:
1. FAIL: any executed automated/compile/build/manual/platform failure or timeout.
2. NOT ASSESSED: zero tests, unconfirmed NOT RUN, missing launch/core/regression,
   UNKNOWN story coverage, or skipped required manual/platform/performance checks.
3. PASS WITH WARNINGS: automated and manual requirements passed, but advisory
   coverage gap/runner warning or externally confirmed (not locally run) tests.
4. PASS: automated requirements and all manual checks pass or justified N/A; no gaps.
Quick can pass only the stated reduced scope. Automated PASS alone cannot certify
overall PASS when launch/manual checks are absent. No auto-fixing source/tests.

## 6. Gate and persistence

Return all evidence to coordinator. Use an independent cgs_qa_tester collaborator
via CODEX-RUNTIME.md to review results when available; explicitly load profile and
require verdict, evidence and gaps. No delegation tool -> report unavailable review.
Normally write authorized report production/qa/smoke-<date>.md; no repeated permission
is needed when user already requested the report in scope. --read-only never writes.
FAIL blocks handoff except advisory config/QA minimal, but never implies readiness.
NOT ASSESSED cannot establish build health; name runnable next checks. PASS WITH
WARNINGS records gaps for story-done; PASS permits manual QA handoff, not release.
Never invoke story-done/release automatically or imply those workflows were tested.
