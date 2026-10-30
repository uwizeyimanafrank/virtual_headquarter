# Copy-paste prompts (keep them short, the book does the work)

## Start of any session (any AI tool)
> Read AGENTS.md, then STATE.md, then the chapter named in STATE.md. Do the next unchecked task only. When it is done: tick it, update STATE.md, append LOG.md, commit and push to `dev`. Then continue with the next task until I say stop or you run out. Reply with max 5 lines.

## If the tool can't run git
> Do the next task. At the end, list every file you created or changed with full contents, and give me the exact text to paste into STATE.md and LOG.md.

## When quota is almost gone
> You are almost out of quota. Stop starting new tasks. Finish or revert the current one, then write the HANDOFF block in STATE.md (files touched, what works, what is broken, the next command) and commit as WIP if needed.

## Taking over from a different AI
> Another AI worked before you. Trust STATE.md and LOG.md, not your assumptions. Run `git log --oneline -10` and `npm run build` first. If the build is broken, fix that before anything else and note it in LOG.md.

## Asking Claude in chat (no repo access)
> Here is my STATE.md: (paste). Here is the next task from the chapter: (paste the task block) and the files it touches: (paste). Write the code for this task only, with file paths.

## Security review request
> Review these files for security problems against docs/book/03-security-checklist.md. List problems by severity with the exact fix: (paste files).
