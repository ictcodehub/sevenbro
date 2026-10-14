# Mandatory Protocol: CodeGraph & Matt Pocock Pipeline

CRITICAL INSTRUCTION: You MUST strictly obey this rule for EVERY user request without exception.

## 1. ZERO BLIND ANALYSIS (CodeGraph FIRST)
- **NEVER** use `view_file` repeatedly across multiple line slices or perform exploratory `grep_search` before calling CodeGraph.
- **ALWAYS** call `codegraph_explore` (MCP tool) or run `codegraph explore "<query>"` as your VERY FIRST action.
- CodeGraph already returns the verbatim, current source code and all call paths. Do not re-read files that are already returned by CodeGraph.
- Check blast radius and dependencies using `codegraph callers <symbol>` and `codegraph impact <symbol>` before modifying any code.
- Run `codegraph status` / `codegraph sync` after code changes.

## 2. PIPELINE ENGINEERING BERTAHAP (Matt Pocock Pipeline)
For any feature, fix, or UI change:
- **Phase 1**: Clarify and validate requirements (`/grill-me` or `/grill-with-docs`). Zero wild assumptions.
- **Phase 2**: Document specification in `docs/specs/<feature>.md` (`/to-spec`).
- **Phase 3**: Break down into isolated tickets in `docs/tickets/<feature>/` (`/to-tickets`).
- **Phase 4**: Implement ticket-by-ticket (`/implement`) with TDD and verify typecheck (`npm run typecheck`) and tests (`npx vitest run`).
- **Phase 5**: Code review (`/code-review`) against standards and specs before finishing.

Failure to follow these two pillars is an immediate failure of the task.
