---
name: cgs-settings
description: "CCGS: Old name of /project-settings. Prints one line, then runs /project-settings."
---

# settings — Codex adaptation

> **Codex adaptation of the original `settings` workflow.** Work on OAKHEAVEN in place, do not create a separate starter game unless explicitly asked. Project AGENTS.md overrides upstream onboarding conventions. Use Codex native tools and subagents instead of Claude `Agent`, `AskUserQuestion`, or `Bash` syntax. When the original names an agent, use its `cgs_...` Codex role when available. The upstream source and scripts are reference material under `oak-studio/upstream/` and are not automatically executed. If the requested workflow involves a destructive operation or launch, request explicit permission. Do not claim hooks run or browser screenshots exist unless observed.


# $cgs-settings — old name of $cgs-project-settings

Several AI tools keep `$cgs-settings` for a command of their own, so this skill is now
`$cgs-project-settings`.

1. Print this line exactly, as the first line of your reply:

   $cgs-settings is now $cgs-project-settings. Running $cgs-project-settings.

2. Run the `project-settings` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `$cgs-project-settings` does the work.
