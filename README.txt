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

Move badges: !! excellent move; ! best move; !? interesting move;
?! inaccuracy; ? mistake; ?? blunder; # checkmate. Short engine searches
provide approximate grades. Excellent moves must stand out from another line
at the same completed search depth (at least 1.25 pawns); interesting moves
require a tactical sacrifice with compensation according to the engine.
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
The checks use the bundled chess rules library and engine; no installation is required.
The Stockfish test runs the bundled engine without external dependencies.

The original conversation ZIP was not retrievable. This implementation follows
the conversation requirements and user-supplied reference images.

GITHUB PAGES

Live app: https://markstruik.github.io/chess-notebook/

.github/workflows/pages.yml validates the app and bundled engine, then deploys
dist/ on every push to main. It also supports manual runs from the Actions tab.
Repository Settings > Pages must use GitHub Actions as its publishing source.
The service-worker asset list is regenerated for every deployment and uses a
cache namespace scoped to this app, so other GitHub Pages apps are unaffected.

MOVE TRAILS AND FOCUS MODE

Gold marks your latest move; orange marks the computer's. White uses gold and
Black orange in two-player games. Both origins and destinations are marked,
with stronger color on the destination.
Each side's trail stays until that side moves again, including during review.
Blue selection and hint markers remain distinct from the orange trails.

Use Focus in the header for the board-only layout. A small hint button uses
the same allowance and concealed hint behavior. Exit with the corner control
or Escape. Focus is remembered on this device; completed games return to
the normal layout for review. Clocks keep running in focus mode.

Board feedback uses a green star for the best move, a blue check for a good
move, and a red cross for a mistake. Finer !!, !?, ?! and ?? badges remain.
The move list and PGN retain the chess annotation symbols.

COACH COMMENTS

Against Stockfish, short local comments describe your last analyzed move and
stay visible in the analysis panel after the bot replies. They work offline.
In focus mode, notable moves and mistakes get a dismissible 8.5-second chat
bubble below the board. Ordinary quiet moves do not trigger a bubble.
The Feedback switch disables the comments as well as move feedback.
Black and White player badges use the same colored king artwork as the board.
The maple/walnut photographic board texture is bundled in dist/board-wood.png.
