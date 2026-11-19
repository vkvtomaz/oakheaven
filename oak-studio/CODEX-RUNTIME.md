# OAKHEAVEN Studio: runtime contract

This is the executable adaptation contract, not a claim of complete upstream parity.
Project instructions and the user's authorized scope win. Claude hooks remain off.

## Discovery and selection

Codex CLI 0.169.0-alpha.11.1 is installed. Current official documentation defines
project agents as standalone `.codex/agents/*.toml` with name, description and
developer_instructions. Existing files already use that schema. Do not add legacy
config_file registrations or change models, permissions or existing oak agents.
Skills belong in `.agents/skills/<name>/SKILL.md`. The Work Mode skills provider
catalog is not proof of repository discovery. A fresh CLI/app-server probe is a
separate test; failure to start it is not failure to parse an individual skill.

## Explicit fallback (tested independently of native role selection)

1. Resolve an exact role with `python oak-studio/tools/studio.py profile cgs_art_director`
   or `cgs_gameplay_programmer`. Read the returned developer_instructions.
2. If the available spawn tool has a native role selector, use it and record the
   selected role. A task_name alone is NOT native selection.
3. Otherwise spawn via collaboration.spawn_agent, naming the exact profile path
   and asking the child to read and adopt it. Pass objective, constraints, sources,
   allowed writes and return contract. Child must confirm profile loaded.
4. Collect its completion with list_agents/messages. Verify commands/artifacts;
   a promise or a task ID alone is not success. At most three children at once.
5. No spawn capability: report BLOCKED for independent delegation; sequential
   role analysis must be labelled as such, never called a separate agent.

## Configuration and legacy dependencies

Run `python oak-studio/tools/studio.py config` explicitly. It reads checked-in
oak-studio/runtime.json, prints provenance, and never executes commands or hooks.
Do not silently copy upstream project.yaml. For workflows not yet ported, compare
each required upstream key and per-system override with actual project settings;
an unmapped key is PENDING, not a fabricated default. JSON is the native adapter
configuration; legacy YAML requires semantic review, not string replacement.

Never evaluate Claude dynamic shell blocks, CLAUDE_SKILL_DIR, yaml-helper.sh,
Agent/subagent_type or AskUserQuestion as executable native APIs. Adapted workflows
use actual available shell/spawn/question tools. Ask only for missing decisions
or required approvals; do not repeat already-authorized changes. No log_decision
tool exists here: record a decision in the authorized report if needed.

## Evidence and progressive conversion

The installed .agents directory denied writes in this session. Adapted pilot entrypoints
are `oak-studio/compat/skills/cgs-dev-story/SKILL.md` and
`oak-studio/compat/skills/cgs-smoke-check/SKILL.md`. Load these paths explicitly;
invoking the installed $cgs name alone may still load the old workflow.
Their read-only
paths test readiness and automated smoke checks without implementing game code.
Normal implementation, browser observation and every QA platform remain separate
branches requiring real evidence. Preserve full originals and references.
For remaining workflows: read all phases/references, map config and helper calls,
implement needed native helpers, run a realistic forward-test, then promote only
the exercised branch. An unavailable helper is BLOCKED; do not execute upstream
scripts just because they were preserved. Do not replace all 76 bodies blindly.

Use `python oak-studio/tools/studio.py catalog` for structural checks (not runtime
certification). Snapshot/verify hash src, img and public. No dependencies needed.

## Observed environment limits

`codex --strict-config app-server --print-startup-config` succeeded (exit 0).
The current config/schema needs no speculative registry correction.
Fresh stdio app-server failed opening the protected user state database (SQLite
code 14). An isolated retry initially timed out because the probe did not drain
stderr concurrently. The corrected probe, with isolated temporary CODEX_HOME,
initialized and skills/list with forceReload discovered all 78 cgs skills.
See compat/discovery-isolated.json. This proves native repository discovery,
not native execution of their old Claude-specific bodies. Isolated startup also
reported untrusted project config; trust was not modified or bypassed.

To use now, ask the coordinator: "Read oak-studio/compat/skills/cgs-dev-story/SKILL.md
and execute --read-only for [story]" or "Read oak-studio/compat/skills/cgs-smoke-check/SKILL.md
and execute quick --read-only". These are explicit adaptations, not a replacement
for native execution. Native role selection is still not exposed by this chat's
spawn tool. A project session with a native selector must confirm actual role
selection before upgrading that part of the status.

Official sources consulted 2026-11-18:
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/skills
