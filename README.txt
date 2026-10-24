CHESS NOTEBOOK

Open dist/index.html through a local HTTP server, rather than directly as a file.
For example: python3 -m http.server 8765 --directory dist
Then visit http://localhost:8765.

The application has no build step and no runtime CDN dependencies. Deploy the
contents of dist/ to any static HTTPS host. Wait for Offline ready before
closing the first online session. Subsequent play, Stockfish opponents,
hints and move analysis work from the service-worker cache.

Select a piece to see green legal destinations. Requesting a hint enables a
concealed hint for that position: only selecting the recommended piece reveals
the best destination in blue. One allowance is consumed per hinted position.

Move badges: ! best move; ?! inaccuracy; ? mistake; ?? blunder; # checkmate.
These use short engine searches and approximate pawn-loss thresholds; they are
learning guidance. A !! brilliant label is deliberately not inferred.
Feedback can be turned off. Review navigation unlocks after a game ends.

Timed modes include increments added after completed moves. The clock continues
across backgrounding and reloads. PGN export includes clock and analysis
comments; PGN import opens a review. Finished games and the current game are
stored in this browser on this device.

Game rules: chess.js 1.4.0, BSD-2-Clause; Stockfish.js 19.0.1 lite single-thread
WebAssembly, GPL-3.0. Licenses and engine source link are in dist/credits.html.
Chess Notebook application code is GPL-3.0. The generated chess artwork is
included in dist/chess-pieces-v2.png. Its alpha bounds are individually centered
with sprite offsets for consistent desktop and mobile placement.

Checks (Node.js required):
  node qa.cjs
  node engine-test.cjs
The rules tests require chess.js; install pinned dependencies with pnpm install.
The Stockfish test runs the bundled engine without external dependencies.

The original conversation ZIP was not retrievable. This implementation follows
the conversation requirements and user-supplied reference images.
