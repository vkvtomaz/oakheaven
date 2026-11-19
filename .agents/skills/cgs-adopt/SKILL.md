---
name: cgs-adopt
description: "CCGS: Brownfield audit — do existing artifacts actually work? Numbered migration plan. Unlike /project-s"
---

# adopt — Codex adaptation

> **Codex adaptation of the original `adopt` workflow.** Work on OAKHEAVEN in place, do not create a separate starter game unless explicitly asked. Project AGENTS.md overrides upstream onboarding conventions. Use Codex native tools and subagents instead of Claude `Agent`, `AskUserQuestion`, or `Bash` syntax. When the original names an agent, use its `cgs_...` Codex role when available. The upstream source and scripts are reference material under `oak-studio/upstream/` and are not automatically executed. If the requested workflow involves a destructive operation or launch, request explicit permission. Do not claim hooks run or browser screenshots exist unless observed.


!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys review_mode,automation,automation_always_ask,workflow`

Resolved above — use as-is. `$cgs-adopt` also inspects `project.yaml` and the legacy
config files directly when reporting and writing migration state; that raw
inspection is deliberate and separate from the resolved values above.

# Adopt — Brownfield Template Adoption

This skill audits an existing project's artifacts for **format compliance** with
the template's skill pipeline, then produces a prioritised migration plan.

**This is not `$cgs-project-stage-detect`.**
`$cgs-project-stage-detect` answers: *what exists?*
`$cgs-adopt` answers: *will what exists actually work with the template's skills?*

A project can have GDDs, ADRs, and stories — and every format-sensitive skill
will still fail silently or produce wrong results if those artifacts are in the
wrong internal format.

**Output:** `docs/adoption-plan-[date].md` — a persistent, checkable migration plan.

**Argument modes:**

**Audit mode:** `$ARGUMENTS` (blank = `full`)

- **No argument / `full`**: Complete audit — all artifact types
- **`gdds`**: GDD format compliance only
- **`adrs`**: ADR format compliance only
- **`stories`**: Story format compliance only
- **`infra`**: Infrastructure artifact gaps only (registry, manifest, sprint-status, stage.txt)

---

**Automation mode**: Resolve `modes.automation` (`project.local.yaml` →
`project.yaml` → default `collaborative`). Every `AskUserQuestion` call follows `oak-studio/upstream/.claude/docs/automation-modes.md`
(collaborative asks always · guided major-only · autonomous logs and proceeds;
`automation_always_ask` categories always prompt).

**`workflow`** (per `oak-studio/upstream/.claude/docs/workflow-modes.md`). It scopes the Phase 2 audit and
Phase 3 severity: `full` audits all doc types at full structure; `standard` audits
only the required docs/sections (optional sections are informational, not gaps);
`minimal` is a `design/game-brief.md` format check — GDDs/ADRs/UX are not expected. See Phase 2.

## Phase 1: Detect Project State

**Read `references/1-detect.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 2: Format Audit

**Read `references/2-format-audit.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 3: Classify and Prioritise Gaps

**Read `references/3-classify.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 4: Build the Migration Plan

**Read `references/4-migration-plan.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 5: Present Summary and Ask to Write

**Read `references/5-summary.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 6: Write the Adoption Plan

**Read `references/6-write.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 7: Offer First Action

**Read `references/7-first-action.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Collaborative Protocol

**Applies in `collaborative` mode (the default).** For `guided` and
`autonomous` modes, see `oak-studio/upstream/.claude/docs/automation-modes.md` — the rules below
describe what collaborative mode requires, not universal behavior.

1. **Read silently** — complete the full audit before presenting anything
2. **Show the summary first** — let the user see scope before asking to write
3. **Ask before writing** — always confirm before creating the adoption plan file
4. **Offer, don't force** — the plan is advisory; the user decides what to fix and when
5. **One action at a time** — after handing off the plan, offer one specific next step,
   not a list of six things to do simultaneously
6. **Never regenerate existing artifacts** — only fill gaps in what exists;
   do not rewrite GDDs, ADRs, or stories that already have content
