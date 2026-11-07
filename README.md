# Idleon Divinity Optimizer

A browser-based planning tool for Legends of Idleon Divinity progression.

## Status

Early foundation release. The app currently provides a local JSON import workspace, a transparent Coral Kid cost/effect calculator, and an optimization planner for spending a user-entered Divinity Point budget. The save parser is deliberately conservative: unknown fields are shown for inspection rather than guessed. Accurate automatic save mapping and live browser capture are follow-up work.

## Run locally

Open `index.html` in a modern browser. No build step or server is required.

## Privacy

- Imported save data stays in this browser tab; this app does not upload it.
- Do not paste passwords, session cookies, or authentication tokens.
- The repository is private. Do not enable GitHub Pages until you have decided whether the resulting site may be public. A private source repository does not automatically make a Pages website private.

## Project layout

- `index.html`, `styles.css`, `src/app.js`: application UI and JSON import.
- `src/divinity.js`: Coral Kid costs, effects, and budget planner.
- `extension/`: Manifest V3 companion extension scaffold and safety notes.
- `docs/`: data-source and implementation notes.

## Important calculation note

The planner uses the published/community-researched Coral Kid cost and effect formulas documented in `docs/game-model.md`. It is a planning heuristic, not a guarantee of a globally optimal game state. Confirm game values after major Idleon updates.
