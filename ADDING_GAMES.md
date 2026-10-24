# Adding a game to Nasty World

1. Put the game in its own folder at the repo root, e.g. `my-game/index.html`. Use relative paths only.
2. Give it a **"Back to Nasty World"** button (link to `../`) on the title, pause and win/lose screens.
3. Show the line `18+ · Crude humor` on its title screen. No popups, no analytics, no external trackers.
4. Assets must be original: code-drawn or generated art, synthesized or original sounds, SIL OFL fonts only.
5. Add a poster: `posters/<id>.mp4` (716×936, H.264 main, yuv420p, muted, 4 s loop, `-movflags +faststart`) plus `posters/<id>.webp` first frame, and 1 to 3 phone screenshots (`posters/<id>-s0.webp` …, 390×844).
6. Add one object to `games.js`:
   ```js
   {id:'my-game', title:'My Game', tagline:'One punchy line.', blurb:'Two sentences.',
    genre:'Arcade', tags:['Tag'], url:'my-game/', poster:'posters/my-game.mp4',
    still:'posters/my-game.webp', shots:['posters/my-game-s0.webp'], badge:'NEW', featured:false}
   ```
   Set `featured:true` on the one game you want in the hero slot.
7. Test at 390×844, 375×667 and 1440 wide in Chromium and WebKit with zero console errors, then `git pull --rebase && git push`.
