
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Overlay HTML
    const mazeOverlay = document.createElement('div');
    mazeOverlay.id = 'mazeOverlay';
    mazeOverlay.className = 'maze-overlay';
    mazeOverlay.innerHTML = `
        <canvas id="mazeCanvas"></canvas>
        <div id="virtualCursor"></div>
        <div class="maze-exit-btn" id="mazeExitBtn" style="display:none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </div>
        
        <div class="maze-esc-hint" id="mazeEscHint">
            <span class="maze-esc-key">Esc</span> to Exit
        </div>
        
        <div class="maze-ui-container">
            <div id="mazeIntroMsg" class="maze-intro-msg">YOU ARE TRAPPED.<br>FIND THE ESCAPE.</div>
            <div id="mazeCharSelect" class="maze-char-select">
                <!-- Buttons injected by JS -->
            </div>
        </div>
    `;
    document.body.appendChild(mazeOverlay);

    const canvas = document.getElementById('mazeCanvas');
    const ctx = canvas.getContext('2d');
    const cursorEl = document.getElementById('virtualCursor');
    const exitBtn = document.getElementById('mazeExitBtn');
    const escHint = document.getElementById('mazeEscHint');
    const introMsg = document.getElementById('mazeIntroMsg');
    const charSelect = document.getElementById('mazeCharSelect');

    // Game Constants
    const CELL_SIZE = 100;
    const WALL_THICKNESS = 1; // "Thin lines"
    const CURSOR_RADIUS = 16; // Visual size (roughly 32px diameter for sprite)
    const CHARACTERS = [
        {
            id: 'recruiter',
            label: 'Recruiter',
            color: '#007AFF',
            frontImg: 'assets/recruiter_front.png',
            spriteSheet: 'assets/recruiter_spritesheet.png'
        },
        {
            id: 'designer',
            label: 'Designer',
            color: '#FF2D55',
            frontImg: 'assets/designer_front.png',
            spriteSheet: 'assets/designer_spritesheet.png'
        },
        {
            id: 'entrepreneur',
            label: 'Entrepreneur',
            color: '#FFCC00',
            frontImg: 'assets/entrepreneur_front.png',
            spriteSheet: 'assets/entrepreneur_spritesheet.png'
        },
        {
            id: 'stranger',
            label: 'Stranger',
            color: '#AF52DE',
            frontImg: 'assets/stranger_front.png',
            spriteSheet: 'assets/stranger_spritesheet.png'
        },
        {
            id: 'friend',
            label: 'Friend',
            color: '#34C759',
            frontImg: 'assets/friend_front.png',
            spriteSheet: 'assets/friend_spritesheet.png'
        }
    ];

    // Direction Mapping (0=S, 1=SE, 2=E, 3=NE, 4=N, 5=NW, 6=W, 7=SW) - Adjusted to match standard 3x3 grid if possible?
    // Let's assume the sprite sheet is 3x3.
    // Row 1: ?, ?, ?
    // Row 2: ?, ?, ?
    // Row 3: ?, ?, ?
    // Standard RMMV/RPG Maker: Down, left, right, up
    // But we generated a "grid of 8 different directions".
    // I need to assume a standard order 0-7.
    // Let's implement dynamic Direction State.
    let currentDirection = 0; // 0-7
    let selectedCharacter = null;
    let spriteImage = null; // Image object

    // Movement Smoothing
    let recentMovementX = 0;
    let recentMovementY = 0;
    let movementHistory = [];
    const MOVEMENT_HISTORY_SIZE = 5; // Average over last 5 events

    // State
    let state = 'IDLE'; // IDLE, INTRO, SELECTION, PLAYING
    let cursorX = 0;
    let cursorY = 0;
    let startX = 0;
    let startY = 0;
    let selectedColor = '#000';
    let walls = []; // Array of line segments {x1, y1, x2, y2}
    let introTimeout = null;
    let fadeTimeout = null;

    // --- Events ---

    // Trigger (Delegated from Main Button)
    // Trigger (Delegated from Main Button)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.dont-push-btn')) {
            startSequence();
        } else if (e.target.closest('#escapeGameLink')) {
            e.preventDefault();
            startSequence();
        } else if (state === 'INTRO') {
            // Skip Intro on Click
            skipIntro();
        }
    });

    // Global Keydown for Escape (Exit from any state)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (state !== 'IDLE') {
                stopGame();
            }
        }
    });

    // Exit Button Logic
    exitBtn.addEventListener('click', () => {
        // Logic handled in update loop for collision mainly, but click event good backup
        stopGame();
    });

    // --- State Machine ---

    function startSequence() {
        if (state !== 'IDLE') return;
        state = 'INTRO'; // Transitional state

        mazeOverlay.classList.add('is-active');
        canvas.style.opacity = '0';

        // Hide others initially
        exitBtn.style.display = 'none';
        escHint.style.display = 'flex'; // Show hint immediately
        cursorEl.style.display = 'none';

        // Direct Start with Mouse Cursor Icon
        startGame({
            id: 'cursor',
            label: 'Cursor',
            color: '#ffffff',
            staticImg: 'assets/Mouse-cursor-hand-pointer.svg.png'
        });
    }

    function skipIntro() {
        if (state !== 'INTRO') return;

        clearTimeout(introTimeout);
        clearTimeout(fadeTimeout);

        introMsg.classList.remove('is-visible');
        introMsg.style.display = 'none';
        showCharacterSelection();
    }

    function showCharacterSelection() {
        state = 'SELECTION';

        introMsg.textContent = "Choose your character";
        introMsg.style.display = 'block';
        setTimeout(() => introMsg.classList.add('is-visible'), 50);

        // Render Buttons
        charSelect.innerHTML = '';
        CHARACTERS.forEach(char => {
            const btn = document.createElement('button');
            btn.className = 'char-btn';

            // Use Image if available, else fallback to dot
            let iconHtml = '';
            if (char.frontImg) {
                iconHtml = `<div class="char-img" style="background-image: url('${char.frontImg}');"></div>`;
            } else {
                iconHtml = `<div class="char-dot" style="background-color: ${char.color}"></div>`;
            }

            btn.innerHTML = `
                ${iconHtml}
                <span class="char-label">${char.label}</span>
            `;
            btn.onclick = (e) => {
                e.stopPropagation(); // Prevent bubbling issues
                startGame(char);
            };
            charSelect.appendChild(btn);
        });

        charSelect.style.display = 'flex';
        // Allow reflow
        setTimeout(() => charSelect.classList.add('is-visible'), 50);

        // Ensure we can click (system cursor visible)
        mazeOverlay.classList.add('state-selection');
    }

    function startGame(character) {
        state = 'PLAYING';
        selectedCharacter = character;
        selectedColor = character.color;

        // Load Sprite Sheet if available
        if (character.spriteSheet) {
            spriteImage = new Image();
            spriteImage.src = character.spriteSheet;
            // Preload? It will load async, that's fine for now.
        } else {
            spriteImage = null;
        }

        // Hide UI
        introMsg.classList.remove('is-visible');
        charSelect.classList.remove('is-visible');
        mazeOverlay.classList.remove('state-selection');

        // Setup Maze
        canvas.style.opacity = '1';
        resizeCanvas();
        generateMazeLines();

        // Setup Cursor
        if (spriteImage) {
            cursorEl.style.backgroundColor = 'transparent';
            cursorEl.style.backgroundImage = `url('${selectedCharacter.spriteSheet}')`;
            cursorEl.style.backgroundSize = '300% 300%'; // Assume 3x3 grid
            cursorEl.style.borderRadius = '0';
            cursorEl.style.width = '64px';  // Doubled size from 32px
            cursorEl.style.height = '64px'; // Doubled size from 32px
            cursorEl.style.imageRendering = 'pixelated'; // Ensure crisp edges
            cursorEl.style.transform = 'translate(-50%, -50%)'; // Center pivot
        } else if (character.staticImg) {
            // Static Image Cursor (Pointer)
            cursorEl.style.backgroundColor = 'transparent';
            cursorEl.style.backgroundImage = `url('${character.staticImg}')`;
            cursorEl.style.backgroundSize = 'contain';
            cursorEl.style.backgroundRepeat = 'no-repeat';
            cursorEl.style.backgroundPosition = 'center';
            cursorEl.style.borderRadius = '0';
            cursorEl.style.width = '32px'; // Standard cursor size
            cursorEl.style.height = '32px';
            cursorEl.style.transform = 'translate(-50%, -50%)';
        } else {
            cursorEl.style.backgroundColor = selectedColor;
            cursorEl.style.backgroundImage = 'none';
            cursorEl.style.borderRadius = '50%';
            cursorEl.style.width = '16px';
            cursorEl.style.height = '16px';
        }
        cursorEl.style.display = 'block';
        exitBtn.style.display = 'flex'; // Show exit
        escHint.style.display = 'flex'; // Show hint

        // Force initial visual update to ensure it appears at start position
        updateCursorVisual();

        // Request Lock
        mazeOverlay.requestPointerLock = mazeOverlay.requestPointerLock || mazeOverlay.mozRequestPointerLock;
        mazeOverlay.requestPointerLock();

        // Listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mozpointerlockchange', onPointerLockChange); // Firefox

        // Initial Draw
        drawMaze();
    }

    function stopGame() {
        state = 'IDLE';
        mazeOverlay.classList.remove('is-active');
        mazeOverlay.classList.remove('state-selection'); // just in case

        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
        if (document.pointerLockElement === mazeOverlay || document.mozPointerLockElement === mazeOverlay) {
            document.exitPointerLock();
        }

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        document.removeEventListener('mozpointerlockchange', onPointerLockChange);
    }

    // --- Game Logic ---

    function onPointerLockChange() {
        if (document.pointerLockElement === mazeOverlay || document.mozPointerLockElement === mazeOverlay) {
            // Locked
            if (state !== 'PLAYING') return; // Should match
        } else {
            // Unlocked (Esc pressed)
            // If in playing state, just exit game
            if (state === 'PLAYING') {
                stopGame();
            }
        }
    }

    function onMouseMove(e) {
        if (state !== 'PLAYING') return;

        let nextX = cursorX + e.movementX;
        let nextY = cursorY + e.movementY;

        // Clamp to screen
        nextX = Math.max(CURSOR_RADIUS, Math.min(canvas.width - CURSOR_RADIUS, nextX));
        nextY = Math.max(CURSOR_RADIUS, Math.min(canvas.height - CURSOR_RADIUS, nextY));

        // Collision Check
        if (checkWallCollision(nextX, nextY)) {
            // Reset to start
            cursorX = startX;
            cursorY = startY;
            flashRed();
        } else {
            cursorX = nextX;
            cursorY = nextY;
        }

        // Calculate Direction based on SMOOTHED movement
        // Add to history
        movementHistory.push({ x: e.movementX, y: e.movementY });
        if (movementHistory.length > MOVEMENT_HISTORY_SIZE) {
            movementHistory.shift();
        }

        // Calculate average
        let avgX = 0;
        let avgY = 0;
        movementHistory.forEach(m => {
            avgX += m.x;
            avgY += m.y;
        });
        avgX /= movementHistory.length;
        avgY /= movementHistory.length;

        // Threshold for change (prevents flickering when stopping or moving slowly)
        if (Math.abs(avgX) > 2 || Math.abs(avgY) > 2) {
            const angle = Math.atan2(avgY, avgX) * 180 / Math.PI;
            let deg = angle; // -180 to 180
            if (deg < 0) deg += 360;
            // deg is now 0-360. 0 = East. 90 = South. 180 = West. 270 = North.

            // Divide into 8 sectors of 45 deg, offset by 22.5
            const sector = Math.floor(((deg + 22.5) % 360) / 45);
            // 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE

            /* 
               Mapping:
               E  (0) -> {c:2, r:1}
               SE (1) -> {c:2, r:2}
               S  (2) -> {c:1, r:2}
               SW (3) -> {c:0, r:2}
               W  (4) -> {c:0, r:1}
               NW (5) -> {c:0, r:0}
               N  (6) -> {c:1, r:0}
               NE (7) -> {c:2, r:0}
            */

            const mapping = [
                { c: 2, r: 1 }, // E  (0)
                { c: 2, r: 2 }, // SE (1)
                { c: 1, r: 2 }, // S  (2)
                { c: 0, r: 2 }, // SW (3)
                { c: 0, r: 1 }, // W  (4)
                { c: 0, r: 0 }, // NW (5)
                { c: 1, r: 0 }, // N  (6)
                { c: 2, r: 0 }  // NE (7)
            ];

            const pos = mapping[sector];
            if (pos) {
                // Update visual
                updateSpriteFrame(pos.c, pos.r);
            }
        }

        updateCursorVisual();
        checkExitHover();
    }

    // --- Sprite Helper ---

    function updateSpriteFrame(col, row) {
        if (!spriteImage) return;

        // Assume 3x3 grid
        // Background Position must be negative offsets
        // Each cell is 33.333% ? No.
        // If background-size is 300% 300%
        // Then we move to:
        // Col 0: 0%
        // Col 1: 50%
        // Col 2: 100%

        const xPercent = col * 50; // 0, 50, 100
        const yPercent = row * 50;

        cursorEl.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
    }

    function checkExitHover() {
        // Simple bounding box check for exit button
        const rect = exitBtn.getBoundingClientRect();
        if (
            cursorX >= rect.left &&
            cursorX <= rect.right &&
            cursorY >= rect.top &&
            cursorY <= rect.bottom
        ) {
            // Check for click? Or just hover? 
            // "Click X" -> The user can click because pointer lock passes clicks.
            // But we need to handle the click event on the button specifically.
            // Since pointer is locked, the 'click' target might be just the element under center?
            // Actually, in pointer lock, click target is usually the locked element.
            // So we rely on manual distance check + click listener on document?
            // Or simpler: If "Hovering" Exit, and user CLICKS, we exit.
        }
    }

    // Add global click listener for "Shooting" the button while locked
    document.addEventListener('mousedown', () => {
        if (state === 'PLAYING') {
            const rect = exitBtn.getBoundingClientRect();
            if (
                cursorX >= rect.left &&
                cursorX <= rect.right &&
                cursorY >= rect.top &&
                cursorY <= rect.bottom
            ) {
                stopGame();
            }
        }
    });

    function updateCursorVisual() {
        cursorEl.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        // Force left/top for transform origin context
        cursorEl.style.left = '0';
        cursorEl.style.top = '0';
        // Actually CSS has translation -50%, but translate(x,y) overrides. 
        // Better:
        cursorEl.style.left = `${cursorX}px`;
        cursorEl.style.top = `${cursorY}px`;
        cursorEl.style.transform = `translate(-50%, -50%)`;
    }

    function checkWallCollision(x, y) {
        // Iterate all walls (lines)
        // A wall is (x1,y1) to (x2,y2).
        // Since walls are orthogonal (horizontal or vertical), this is simpler.

        // Optimize: Convert x,y to grid coordinates and only check walls of that cell?
        // Simpler for now: Check list (performance is fine for <500 lines)

        for (let w of walls) {
            // Check distance from point to line segment
            // Since orthogonal:
            if (w.x1 === w.x2) { // Vertical Wall
                // Check if Y range matches
                if (y >= Math.min(w.y1, w.y2) - CURSOR_RADIUS && y <= Math.max(w.y1, w.y2) + CURSOR_RADIUS) {
                    // Check X distance
                    if (Math.abs(x - w.x1) < CURSOR_RADIUS + (WALL_THICKNESS / 2)) {
                        return true;
                    }
                }
            } else { // Horizontal Wall
                // Check X range matches
                if (x >= Math.min(w.x1, w.x2) - CURSOR_RADIUS && x <= Math.max(w.x1, w.x2) + CURSOR_RADIUS) {
                    // Check Y distance
                    if (Math.abs(y - w.y1) < CURSOR_RADIUS + (WALL_THICKNESS / 2)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- Maze Generation (DFS) ---

    function generateMazeLines() {
        walls = [];

        // Dynamic Cell Size to fit screen exactly (no gaps)
        // Target approx 100px-150px
        const targetSize = 120;
        const cols = Math.round(canvas.width / targetSize);
        const rows = Math.round(canvas.height / targetSize);

        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;

        // Create Grid
        const grid = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({
                    visited: false,
                    top: true,
                    right: true,
                    bottom: true,
                    left: true,
                    c, r
                });
            }
            grid.push(row);
        }

        // Start from center
        const startC = Math.floor(cols / 2);
        const startR = Math.floor(rows / 2);

        // DFS Stack
        const stack = [];
        const current = grid[startR][startC];
        current.visited = true;
        stack.push(current);

        // Set Start Position (Pixel)
        startX = (startC * cellW) + (cellW / 2);
        startY = (startR * cellH) + (cellH / 2);
        cursorX = startX;
        cursorY = startY;

        while (stack.length > 0) {
            const curr = stack.pop();
            const neighbors = getUnvisitedNeighbors(curr, grid, cols, rows);

            if (neighbors.length > 0) {
                stack.push(curr);

                // Heuristic: Slightly prefer neighbors closer to Top-Right (c++, r--)?
                // To make it "Simpler/Faster" to exit?
                // Or just random. Let's stick to random but rely on post-processing for "Simpler".
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];

                removeWalls(curr, next);

                next.visited = true;
                stack.push(next);
            }
        }

        // --- Post-Processing for "Simpler" Maze ---
        // 1. Remove random walls to create loops (Braiding)
        // Remove ~15% of remaining walls
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                // Randomly open right/bottom if they exist and aren't boundary
                if (c < cols - 1 && cell.right && Math.random() < 0.15) {
                    cell.right = false;
                    grid[r][c + 1].left = false;
                }
                if (r < rows - 1 && cell.bottom && Math.random() < 0.15) {
                    cell.bottom = false;
                    grid[r + 1][c].top = false;
                }
            }
        }

        // 2. CLEAR EXIT AREA (Top Right)
        // Ensure the top-right cell (where button is) is open
        // Button is 60x60 at top 32, right 32. 
        // Targeted cell: grid[0][cols-1]
        const exitCell = grid[0][cols - 1];

        // Clear internal walls of exit cell and maybe neighbors to ensure open space
        if (exitCell.left) {
            exitCell.left = false;
            if (cols > 1) grid[0][cols - 2].right = false;
        }
        if (exitCell.bottom) {
            exitCell.bottom = false;
            if (rows > 1) grid[1][cols - 1].top = false;
        }

        // Also clear the actual border walls of the screen at the exit?
        // User said "Button should be exit at the exit of labyrinth".
        // Usually maze keeps screen border. But if we want it to feel like "Exit", 
        // maybe we don't draw the screen border at that corner? 
        // Our 'walls' array generation logic below handles internal walls. 
        // Screen borders are implicitly implied if we draw "top/left/right/bottom" for edge cells.
        // Let's REMOVE the screen boundary walls at the top-right corner.
        exitCell.top = false;
        exitCell.right = false;

        // Convert Grid to Lines
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const x = c * cellW;
                const y = r * cellH;

                if (cell.top) walls.push({ x1: x, y1: y, x2: x + cellW, y2: y });
                if (cell.left) walls.push({ x1: x, y1: y, x2: x, y2: y + cellH });
                if (c === cols - 1 && cell.right) walls.push({ x1: x + cellW, y1: y, x2: x + cellW, y2: y + cellH });
                if (r === rows - 1 && cell.bottom) walls.push({ x1: x, y1: y + cellH, x2: x + cellW, y2: y + cellH });
            }
        }
    }

    function getUnvisitedNeighbors(cell, grid, cols, rows) {
        const list = [];
        const { c, r } = cell;

        // Top
        if (r > 0 && !grid[r - 1][c].visited) list.push(grid[r - 1][c]);
        // Right
        if (c < cols - 1 && !grid[r][c + 1].visited) list.push(grid[r][c + 1]);
        // Bottom
        if (r < rows - 1 && !grid[r + 1][c].visited) list.push(grid[r + 1][c]);
        // Left
        if (c > 0 && !grid[r][c - 1].visited) list.push(grid[r][c - 1]);

        return list;
    }

    function removeWalls(a, b) {
        const dx = a.c - b.c;
        const dy = a.r - b.r;

        if (dx === 1) { // A is right of B
            a.left = false;
            b.right = false;
        } else if (dx === -1) { // A is left of B
            a.right = false;
            b.left = false;
        }

        if (dy === 1) { // A is below B
            a.top = false;
            b.bottom = false;
        } else if (dy === -1) { // A is above B
            a.bottom = false;
            b.top = false;
        }
    }

    function drawMaze() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#666'; // White/Grey walls for dark mode
        ctx.lineWidth = WALL_THICKNESS;

        ctx.beginPath();
        walls.forEach(w => {
            ctx.moveTo(w.x1, w.y1);
            ctx.lineTo(w.x2, w.y2);
        });
        ctx.stroke();
    }

    function resizeCanvas() {
        mazeOverlay.style.display = 'block'; // Ensure bounds calc
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function flashRed() {
        // mazeOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        // setTimeout(() => mazeOverlay.style.background = '', 100);
        // Better: Flash the canvas? Or cursor?
        const original = cursorEl.style.transform;

        cursorEl.style.transform += ' scale(2)';
        setTimeout(() => updateCursorVisual(), 100);
    }

    window.addEventListener('resize', () => {
        if (state === 'PLAYING') {
            stopGame(); // Simplest to reset on resize
        }
    });

});
