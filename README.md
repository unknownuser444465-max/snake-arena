# Snake Arena Starter

A small browser-game starter project with:
- A polished canvas-based snake arena UI.
- A Node.js + Express web server.
- A Socket.IO server that synchronizes player positions, food, scores, and a leaderboard for connected players.
- A local practice fallback if the multiplayer server is unavailable.

## Requirements
- Node.js 20 LTS or a current supported LTS version
- npm (included with Node.js)
- A modern browser

## Run on Windows

1. Install Node.js from https://nodejs.org/ (choose an LTS release).
2. Extract this project ZIP into a folder such as `C:\Projects\snake-arena-starter`.
3. Open that folder in VS Code.
4. In VS Code choose **Terminal → New Terminal**.
5. Run:

   ```powershell
   npm install
   npm start
   ```

6. Open http://localhost:3000 in your browser.
7. Enter a nickname and press **Play now**.

Keep the terminal open while you play. Stop the server with `Ctrl+C`.

## Test multiplayer locally

1. Keep `npm start` running.
2. Open http://localhost:3000 in two different browser tabs, or one normal and one private window.
3. Join with different nicknames.
4. Both clients should see the connected snakes and the online player count.

This is a starter implementation, not a production-ready game. Its collision and movement model is intentionally simple. Test with two clients before publishing.

## Files
- `server.js`: Express + Socket.IO server and basic game loop
- `public/index.html`: page structure
- `public/style.css`: responsive game styling
- `public/game.js`: canvas rendering, controls, local practice, multiplayer client
- `package.json`: dependencies and start command

## Deployment path

This project needs a Node.js host that supports long-running processes and WebSockets; a static-only host is not enough for the multiplayer server.

1. Push the folder to a GitHub repository.
2. Create a Node web service on a host that supports WebSockets (for example, Render or Railway).
3. Set the build/install command to `npm install`.
4. Set the start command to `npm start`.
5. Ensure the host provides `PORT`; the server reads `process.env.PORT`.
6. Open the public HTTPS URL and test with multiple devices and networks.

Free hosting availability, sleep behavior, quotas, and prices change; check the provider's current plan before choosing one. If you deploy a static-only copy, the interface may load but online multiplayer will not work.

## Monetization plan

Start with a free game and validate that people return:
1. Add privacy and terms pages before collecting account information or using ad providers.
2. Apply to an advertising provider only after checking its current site and game-content policies. Approval and earnings are not guaranteed.
3. Consider cosmetic skins, themes, and private rooms. Avoid pay-to-win advantages.
4. Track daily active players, returning players, session length, and crashes.
5. Add server-side validation, rate limits, anti-cheat controls, and moderation before scaling.

Do not sell cash prizes or add paid-entry tournaments without checking the laws and platform rules that apply to your target countries. Never promise users that playing will earn them money.

## Current limitations
- No persistent accounts or saved progress.
- No production-grade anti-cheat, rate limiting, moderation, or privacy/terms pages.
- The server uses a basic shared arena; there are no separate rooms yet.
- The server collision model resets a snake when it hits another snake.
- No ad integration or payment processing is included.
- Multiplayer is implemented in the code, but you should verify it locally with two browser clients before considering it tested or production-ready.
