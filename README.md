# Real-time Chat Application

## What this is
A small real-time chat application built with:
- Frontend: HTML, CSS, vanilla JavaScript
- Server: Node.js WebSocket server using the `ws` package

Features:
- Create and join chat rooms
- Username selection (unique across active users)
- Real-time messaging with username + timestamp
- Basic text formatting: **bold**, *italic*, and clickable links
- Active user list per room
- Auto room list updates and simple notifications

## How to run (local)

1. Make sure you have Node.js installed (v14+).
2. Extract the project folder and open a terminal in that folder.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
   By default the server listens on port `3000`.
5. Open the frontend:
   - Open `index.html` in your browser **directly** (double-click) and it will attempt to connect to `ws://localhost:3000`.
   - Alternatively, serve the folder over a simple static server (recommended when testing from other devices), e.g.:
     ```
     npx http-server . -p 8080
     ```
     Then open `http://localhost:8080` in your browser.

## Notes and tips
- Usernames are prevented from being duplicated while they are active. If a user disconnects, the username becomes available again.
- This is a demo-level server for learning purposes. For any production use you should:
  - Add persistent storage and authentication
  - Use secure WSS (TLS) and origin checking
  - Validate and sanitize all inputs on server-side
- The server broadcasts a system message when users join/leave and deletes empty rooms automatically.

## Submission
The `chat_app_project.zip` file contains all source files and this README.
