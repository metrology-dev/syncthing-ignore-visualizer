# Project: Syncthing Ignore Pattern Visualizer

## Objective

Design and implement a production-quality, completely client-side web application that teaches, visualizes, and allows experimentation with Syncthing's `.stignore` ignore pattern engine.

This project is **not** simply a pattern tester. It should become an interactive educational tool that visually explains how Syncthing evaluates every rule and why each file is ultimately included or ignored.

The application should be polished enough that it could realistically serve as an interactive companion to the official Syncthing documentation.

---

# First Task: Research

Before writing any code, thoroughly research the official Syncthing documentation.

Primary reference:

https://docs.syncthing.net/

Especially:

https://docs.syncthing.net/users/ignoring.html

Study and understand:

- ignore rule syntax
- evaluation order
- precedence
- negated patterns (`!`)
- root anchored paths (`/`)
- recursive matching (`**`)
- wildcard behavior (`*`, `?`, `[]`)
- delete-only rules (`(?d)`)
- case-insensitive rules (`(?i)`)
- escaping rules
- comments
- `#include`
- directory matching
- path normalization
- platform differences
- edge cases
- any implementation notes available

The ignore matcher should reproduce Syncthing behavior as closely as practical. Do **not** assume Git ignore semantics where they differ from Syncthing.

Document any ambiguous behavior and the implementation decisions you make.

---

# Project Goals

The application should function as:

1. An educational visualization tool.
2. A live `.stignore` sandbox.
3. A folder tree explorer.
4. A rule debugger.
5. A reference implementation of Syncthing ignore evaluation.

The application should emphasize **understanding**, not merely displaying results.

---

# Technology Requirements

Use only:

- HTML5
- CSS3
- TypeScript

Rendering:

- SVG

No backend.

No Python.

No Node.js runtime requirements for the finished application (Node-based build tooling such as Vite is acceptable).

Avoid heavy frameworks unless there is a compelling reason.

Prefer lightweight, modular code.

---

# UI / UX Requirements

Design a modern professional interface.

Preferred style:

- Material Design 3 inspired
- clean
- information dense
- responsive
- desktop first
- keyboard accessible
- accessible colors
- dark theme
- light theme
- smooth animations
- scalable SVG rendering

The interface should immediately communicate:

- current rule
- matching files
- current file state
- evaluation history

---

# Main Layout

Divide the interface into four primary panels.

---

## 1. Folder Tree

Display a graphical folder hierarchy.

Features:

- expand/collapse folders
- file icons
- folder icons
- search
- filtering
- zoom
- hover tooltips

Every node has a visual state.

Green

Included

Red

Ignored

Yellow

Matched by current rule

Gray

Unaffected during current step

Clicking a file opens a detail pane showing:

- full path
- current state
- evaluation history
- all matching rules
- final decision
- explanation

---

## 2. .stignore Editor

Editable text editor.

Features:

- syntax highlighting
- line numbers
- comments
- parser diagnostics
- warnings
- current rule highlighting
- validation
- autocomplete where appropriate

Changes should immediately update the visualization.

No page reload.

---

## 3. Evaluation Timeline

Controls:

- Previous
- Next
- Play
- Pause
- Reset
- Jump to Final
- Timeline slider

The slider should scrub through evaluation history.

Animation should clearly show:

- matched files
- changed state
- current rule
- previous state
- new state

---

## 4. Explanation Panel

Explain every step in plain English.

Example:

Current Rule

```
*.tmp
```

Explanation

> Matches every filename ending in `.tmp`.

Matched Files

- temp.tmp
- important.tmp

Effect

Both files become ignored.

---

# Built-in Example

Ship with a default demonstration.

Example tree:

```
Project/

    notes.txt

    report.docx

    README.md

    important.tmp

    temp.tmp

    cache/

        index.db

        temp.dat

    build/

        app.exe

        app.pdb

    src/

        main.ts

        utils.ts

    images/

        logo.png

        background.jpg

    backup/

        old/

            archive.zip
```

Default rules:

```
*.tmp

cache/

!important.tmp

build/

**/backup/

(?d).DS_Store

(?i)README.md
```

These should demonstrate:

- wildcard matching
- directory matching
- negation
- recursive matching
- delete-only
- case insensitive rules

---

# Import Folder Trees

Support importing folder structures from the output of the CLI command:

Windows

```
tree /F
```

Linux/macOS

```
tree
```

Support:

- drag and drop
- file picker
- paste text

Automatically parse the output into the internal folder hierarchy.

Handle both Windows and Unix tree formats.

Gracefully report malformed input.

---

# Rule Evaluation Engine

Implement the matcher as an independent module.

Input:

- folder tree
- ignore rules

Output:

- matched rules
- evaluation history
- final state

Every rule should be evaluated sequentially.

Animate:

Initial

Everything included.

Each rule:

Matched files flash yellow.

Then transition:

Included → Ignored

Ignored → Included

etc.

The visualization should clearly demonstrate how later rules override earlier ones.

---

# File History

Maintain complete evaluation history.

Example:

important.tmp

Initial

Included

Rule 1

Matched *.tmp

Ignored

Rule 2

No match

Rule 3

Matched !important.tmp

Included

Rule 4

No match

Final

Included

---

# Legend

Always visible.

Green

Included

Red

Ignored

Yellow

Matched during current step

Gray

Unaffected during current step

---

# Search

Support:

Search files

Search folders

Search rules

Highlight search results

---

# Zoom

Support:

Zoom in

Zoom out

Fit to screen

Reset zoom

---

# Animation

Use CSS animations and transitions.

Avoid heavyweight animation libraries.

Animations should reinforce understanding rather than distract.

---

# Architecture

Organize the project into well-defined modules.

Example:

```
src/

app.ts

matcher.ts

parser.ts

tree.ts

renderer.ts

timeline.ts

history.ts

ui.ts

types.ts

utils.ts
```

Keep files focused and maintainable.

Avoid monolithic implementations.

---

# Performance

Support projects with several thousand files.

Use efficient rendering.

Avoid unnecessary recalculation.

---

# Extensibility

Design for future features such as:

- SVG export
- PNG export
- JSON export
- evaluation reports
- import real `.stignore`
- multiple synchronized views
- rule statistics
- matcher benchmarking
- side-by-side rule comparisons

---

# Testing

Create a comprehensive automated test suite.

Include:

## Unit Tests

- parser
- matcher
- tree parser
- timeline
- renderer where practical

## Integration Tests

Test complete evaluation workflows.

## Edge Case Tests

Cover every rule type documented by Syncthing.

Include tests for:

- negation
- recursive rules
- includes
- escaping
- delete-only
- root paths
- case insensitive rules

Use snapshot tests where appropriate.

Document test coverage.

---

# Documentation

Produce high-quality documentation.

Create:

```
README.md
```

Project overview.

Installation.

Development.

Usage.

Architecture.

---

```
docs/

Architecture.md

Matcher.md

Parser.md

Rendering.md

Timeline.md

FolderParser.md

Testing.md

Design.md

KnownLimitations.md

FutureIdeas.md
```

Include architecture diagrams where appropriate.

---

# Persistent AI Project Memory

Set up the repository so future AI coding sessions can continue efficiently with minimal context loss.

Create and maintain the following structure:

```
CLAUDE.md

HANDOFF.md

todo.md

CHANGELOG.md

DECISIONS.md

ROADMAP.md

docs/

.claude/

    knowledge/

        project-overview.md
        architecture.md
        matcher.md
        ui.md
        coding-standards.md
        testing.md
        glossary.md

    skills/

        project-guidelines/
        testing/
        documentation/
```

## CLAUDE.md

This should act as the primary AI project memory.

Include:

- project purpose
- architecture summary
- coding conventions
- design philosophy
- important implementation details
- build commands
- test commands
- project structure
- known pitfalls
- future improvements

Keep this file concise but comprehensive.

---

## HANDOFF.md

Designed for session continuity.

Update after every major milestone.

Include:

- completed work
- current status
- unfinished tasks
- active problems
- recommended next steps
- files modified
- important context for the next AI session

---

## todo.md

Maintain an actively prioritized task list.

Each task should include:

- priority
- status
- description
- dependencies
- notes

---

## CHANGELOG.md

Record meaningful project changes.

Follow Keep a Changelog where practical.

---

## DECISIONS.md

Maintain an architectural decision log (ADR-style).

Each decision should include:

- context
- options considered
- decision
- rationale
- consequences

---

## ROADMAP.md

Maintain a phased roadmap.

Example:

Phase 1

Core matcher

Phase 2

Visualization

Phase 3

Animation

Phase 4

Import/export

Phase 5

Advanced educational features

---

## .claude/knowledge

Maintain persistent project knowledge for AI agents.

Store stable information only.

Examples:

- architecture
- matcher semantics
- folder parser
- design language
- coding standards
- glossary
- testing strategy

Avoid storing temporary implementation notes.

---

## .claude/skills

Create reusable development workflows.

Examples:

- implementing new features
- writing tests
- updating documentation
- performing code reviews
- maintaining project memory
- release checklist

These should be generic enough to reuse across future work on the project.

---

# Code Quality

Strong TypeScript typing.

Readable code.

Small functions.

Minimal duplication.

Well-defined interfaces.

Clear separation of concerns.

Comments only where they add value.

Prefer maintainability over cleverness.

---

# Deliverables

The completed repository should include:

- fully working application
- reusable matcher engine
- comprehensive tests
- extensive documentation
- persistent AI project memory
- maintainable architecture
- clean modular TypeScript
- polished user experience

---

# Success Criteria

A user with no prior knowledge of Syncthing should be able to use the application to understand:

- how `.stignore` files are evaluated
- why a file is ignored
- why a file is included
- how rule ordering affects the result
- how negation works
- how recursive matching works
- how root anchoring works
- how delete-only rules behave
- how case-insensitive rules behave
- how `#include` works

The final product should be accurate, educational, visually engaging, extensible, and suitable as a long-term open-source reference implementation and interactive learning tool for Syncthing ignore patterns.