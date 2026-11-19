---
name: cgs-help
description: "CCGS: Old name of /next-step. Prints one line, then runs /next-step."
---

# help — Codex adaptation

> **Codex adaptation of the original `help` workflow.** Work on OAKHEAVEN in place, do not create a separate starter game unless explicitly asked. Project AGENTS.md overrides upstream onboarding conventions. Use Codex native tools and subagents instead of Claude `Agent`, `AskUserQuestion`, or `Bash` syntax. When the original names an agent, use its `cgs_...` Codex role when available. The upstream source and scripts are reference material under `oak-studio/upstream/` and are not automatically executed. If the requested workflow involves a destructive operation or launch, request explicit permission. Do not claim hooks run or browser screenshots exist unless observed.


# $cgs-help — old name of $cgs-next-step

Most AI tools keep `$cgs-help` for a command of their own, so this skill is now
`$cgs-next-step`.

1. Print this line exactly, as the first line of your reply:

   $cgs-help is now $cgs-next-step. Running $cgs-next-step.

2. Run the `next-step` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `$cgs-next-step` does the work.
