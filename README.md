# Project: Last Light (2.5D)

This package combines the 2.5D Three.js client from `project-last-light-25d` with the multiplayer mission server from `project_last_light_v6`.

## First-time setup
1. Install Node.js if it is not already installed.
2. Open this folder in VS Code.
3. Open a terminal in this folder and run `npm install`.

## Run the game locally
Open **two terminals** in this folder.

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run dev
```

Open the Vite URL printed by the second terminal (usually `http://localhost:5173`). The game client connects to the server at `http://localhost:3000`.

If port 3000 is already in use, stop the other server process before running `npm run server`.

## Build
Run `npm run build`. The server also serves the built `dist` files if you open `http://localhost:3000` after building.

## Notes
- The 2.5D client and its assets are preserved.
- The server's monster chase is enabled when emergency power is restored, and its detection range now covers the station so the initial distance does not prevent it from pursuing the crew.
- This ZIP intentionally excludes `node_modules`; run `npm install` once after extracting.
