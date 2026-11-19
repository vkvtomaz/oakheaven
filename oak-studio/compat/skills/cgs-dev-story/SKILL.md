---
name: cgs-dev-story
description: Implement one bounded OAKHEAVEN story with explicit Codex delegation, prerequisites, tests and runtime evidence; --read-only evaluates readiness without writing.
---

# Dev Story — explicit Codex adapter

Read `oak-studio/CODEX-RUNTIME.md`. Use this file as the executable workflow.
The previous workflow is preserved at `oak-studio/compat/originals/cgs-dev-story.md`.
Original scripts and reference syntax are historical, not commands to execute.

## Inputs and config

`$cgs-dev-story <story-path> [--read-only]`
Run `python oak-studio/tools/studio.py config`. Read the JSON; report workflow tier,
QA level, configuration source and unsupported settings. Never equate QA level,
rigor and workflow. Do not copy an upstream project template into this existing game.

## 1. Resolve story

Read the named story in full. Without a path inspect `production/epics/` for In
Progress then Ready stories; ask for a choice if ambiguous. No candidate -> BLOCKED,
with missing input. Extract criteria, out-of-scope, type, layer, status, dependencies,
ADR/version, manifest/version, TR IDs and Test Evidence using ordinary file reads.

## 2. Readiness

Full tier requires `docs/architecture/tr-registry.yaml`; otherwise it is optional.
Resolve each TR ID from that registry when present. Every named ADR must exist and
be Accepted: Proposed, Deprecated, Superseded or absent -> BLOCKED; name the decision
or successor needed. Do not accept it yourself. No ADR named is not a missing ADR.
Missing control manifest is a warning at standard/full, not expected at minimal.
Read its layer rules when present.

Compare story ADR/manifest versions with current versions. Equal or unstamped ADR:
trust summary, explicitly mark unstamped guidance unverified. Mismatch: read changed
sections and request refresh, explicit risk acceptance or stop. Record drift as a
deviation. Never bypass drift by inventing a version. Read dependencies: absent ->
warning; incomplete -> BLOCKED unless user accepts risk or authorizes status repair.

`--read-only` stops before all writes. Still delegate a readiness/implementation
analysis under step 4; return READY FOR IMPLEMENTATION or BLOCKED. This does not
exercise or certify the implementation path. Do not run a build or install.

## 3. Track progress

For authorized implementation update story Status, Last Updated, existing sprint
entry, then its Files section at completion. Preserve unrelated fields. At minimal
no sprint is required. Explicitly report excluded/absent status updates. User scope
is authorization for reversible work; request only missing material decisions.

## 4. Explicit delegation

Foundation -> cgs_engine_programmer; UI -> cgs_ui_programmer; visual/gameplay ->
cgs_gameplay_programmer; AI/pathfinding -> cgs_ai_programmer; networking ->
cgs_network_programmer. Config/Data can be handled by coordinator with before/after
values. Web engine review -> cgs_lead_programmer, never an unrelated engine expert.
Use native selection only if the actual tool accepts a role. Otherwise load the
chosen TOML and explicitly pass its developer instructions and boundaries to a
collaborator as CODEX-RUNTIME.md specifies. Name this adapted selection. A task
label is not profile loading. Maximum three simultaneous subagents. No delegation
capability -> BLOCKED delegation, no fictitious specialist result.

## 5. Implementation contract

Pass criteria, exclusions, real source/test roots, governing TR facts, ADR summary,
manifest rules, QA level, actual commands and omitted optional inputs. Minimal QA
waives a mandatory test file; standard/full Logic or Integration stories need
meaningful tests at their evidence path. New tuning values belong in real data files.
Require completion state, changed files, tests, command exit codes, acceptance
evidence, unprescribed decisions and blockers. Verify returned artifacts on disk.
Missing artifact, partial output or early stop -> INCOMPLETE; blocker stops dependent
work. Resume the collaborator to fulfill an unmet contract. After implementation
request independent read-only API review from lead programmer. Breaking defects
return to programmer; other risks remain documented.

## 6. Verify

Read package scripts first. Execute `npm test` and
`node node_modules/typescript/bin/tsc --noEmit`; record counts and exit codes. Normal
implementation may also run `npm run build` if generated output is allowed. Missing
runtime/dependencies -> NOT VERIFIED, never automatic installation. Compile success
is not launch success. Other engines are outside this adapter: BLOCKED.
For visible changes use available browser tools to run the affected scene, capture
and inspect an actual screenshot. Movement/animation requires real input/state test.
Unavailable -> `Run result: NOT VERIFIED - reason`. No fabricated screenshots.
If an existing same-seed replay is required, use a reviewed compatible runner;
unavailable -> Same-seed run: NOT ASSESSED. Changed behavior requires acceptance of
intended change; regressions remain INCOMPLETE.

## 7. Report

Return Implemented/INCOMPLETE/BLOCKED; files; criteria with concrete evidence; tests;
omitted checks; deviations; API risks; blockers and specialist decisions. Read-only
returns readiness and says no implementation occurred. Write an authorized normal
checkpoint with file tools, never a hook; read-only returns all evidence in chat.
End with exactly one Run result line. Next: minimal -> cgs-story-done; standard/full
-> cgs-code-review then cgs-story-done; incomplete -> resume; blocked -> unblock action.
Next workflows are not automatically invoked or certified by running this workflow.
