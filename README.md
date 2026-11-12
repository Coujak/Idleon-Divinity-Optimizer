# Idleon Divinity Optimizer

A browser-based planning tool for Legends of Idleon Divinity progression.

## Status

Early foundation release. The app currently provides a local JSON import workspace, a transparent Coral Kid cost/effect calculator, and an optimization planner for spending a user-entered Divinity Point budget. The save parser is deliberately conservative: unknown fields are shown for inspection rather than guessed. Accurate automatic Coral Kid save mapping remains follow-up work. An opt-in Google/Firebase cloud-save client has been added but requires independent OAuth configuration and real-account validation.

## Run locally

Open `index.html` in a modern browser. No build step or server is required.

## Privacy

- Imported save data stays in this browser tab; this app does not upload it.
- Do not paste passwords, session cookies, or authentication tokens.
- This is a public GitHub Pages site. Do not commit private account data or OAuth secrets.

## Project layout

- `index.html`, `styles.css`, `src/app.js`: application UI and JSON import.
- `src/divinity.js`: Coral Kid costs, effects, and budget planner.
- `extension/`: Manifest V3 companion extension scaffold and safety notes.
- `docs/`: data-source and implementation notes.

## Important calculation note

The planner uses the published/community-researched Coral Kid cost and effect formulas documented in `docs/game-model.md`. It is a planning heuristic, not a guarantee of a globally optimal game state. Confirm game values after major Idleon updates.

## Recording God Rank offering attempts

Use **Plan God Rank** to view the current low and high offers. After making an in-game attempt, choose which category you attempted and enter **both** offerings now visible in the game—either category can change, even when the other was attempted. **Record failed attempt** subtracts the modeled cost without changing God Rank; **Record successful attempt** subtracts the modeled cost and increases God Rank by one. Both outcomes update both offerings and recalculate the next recommendation. The record counts reset when importing a new save.

Observed offerings are entered manually; the planner does not know what the game rerolled. For its **estimated** adaptive recommendation, it currently assumes both categories can reroll independently and uniformly after a failure and considers up to 18 attempts. The true game reroll probabilities and any cost-saving effects are not verified. If a free-offering bonus avoids spending Divinity Points, adjust the displayed DP balance to match the game.

## Optional Google/Firebase cloud-save connection (experimental)

The interface offers Google sign-in, manual cloud refresh, five-minute polling, and disconnect. It is **not functional out of the box**. To enable it, register an authorized Google OAuth web client for your deployed origin and set `GOOGLE_CLIENT_ID` and `FIREBASE_API_KEY` in `src/auth-config.js`. The Firebase key must correspond to an authorized integration with the Idleon Firebase project. Do not copy third-party client secrets or credentials; an arbitrary new Firebase project key will not grant access to Idleon's database.

The integration uses Google Identity Services in the browser and exchanges the Google access token for a Firebase session. It reads the authenticated Firestore and Realtime Database save records. It has not been validated against a real account, and may fail due to OAuth restrictions, Firebase configuration, or API access policy. No Steam login or automatic detection of the game's cloud-save event is implemented; the optional polling checks every five minutes while the webpage is open. The Firebase ID token is kept in memory only and is cleared on disconnect or page reload. JSON import remains available without authentication.

**Important:** Cloud-save fetching and Coral Kid field mapping are separate tasks. The current parser only inspects raw Divinity data and does not yet populate planner fields automatically. Confirm field mappings using a representative sanitized Idleon Toolbox JSON export before enabling automatic recommendations.
