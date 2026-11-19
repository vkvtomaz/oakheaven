---
name: cgs-changelog
description: "CCGS: Old name of /write-changelog. Prints one line, then runs /write-changelog."
---

# changelog — Codex adaptation

> **Codex adaptation of the original `changelog` workflow.** Work on OAKHEAVEN in place, do not create a separate starter game unless explicitly asked. Project AGENTS.md overrides upstream onboarding conventions. Use Codex native tools and subagents instead of Claude `Agent`, `AskUserQuestion`, or `Bash` syntax. When the original names an agent, use its `cgs_...` Codex role when available. The upstream source and scripts are reference material under `oak-studio/upstream/` and are not automatically executed. If the requested workflow involves a destructive operation or launch, request explicit permission. Do not claim hooks run or browser screenshots exist unless observed.


# $cgs-changelog — old name of $cgs-write-changelog

Several AI tools keep `$cgs-changelog` for a command of their own, so this skill is now
`$cgs-write-changelog`.

1. Print this line exactly, as the first line of your reply:

   $cgs-changelog is now $cgs-write-changelog. Running $cgs-write-changelog.

2. Run the `write-changelog` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `$cgs-write-changelog` does the work.
