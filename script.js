// Game variables
const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score-value');
const healthContainer = document.getElementById('health-container');
const levelDisplay = document.getElementById('level-value');
const gameOverScreen = document.getElementById('game-over');
const gameStartScreen = document.getElementById('game-start');
const finalScoreDisplay = document.getElementById('final-score-value');
const finalLevelDisplay = document.getElementById('final-level-value');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const logo = document.getElementById('logo');
const bgMusic = document.getElementById("bgMusic");
const viewScoresButton = document.getElementById('view-scores-button');
const leaderboardOverlay = document.getElementById('leaderboard-overlay');
const leaderboardList = document.getElementById('leaderboard-list');
const saveScoreForm = document.getElementById('save-score-form');
const playerNameInput = document.getElementById('player-name');
const saveScoreButton = document.getElementById('save-score-button');
const closeLeaderboardButton = document.getElementById('close-leaderboard-button');

let gameRunning = false;
let score = 0;
let lives = 10;
let maxLives = 10;
let currentLevel = 1;
let playerX = 375;
let playerSpeed = 7;
let alienDirection = 1;
let alienDownStep = 30;
let alienSpeed = 1; // Start slower
let alienFireRate = 0.0025; // Lower fire rate to start (easier)
let keysPressed = {};
let lastShotTime = 0;
let shotCooldown = 230; // milliseconds
let gameLoopInterval;
let aliens = [];
let playerLasers = [];
let alienLasers = [];
let playerLastDirection = 'neutral'; // Track player's last movement direction
let currentScoreSaved = false;
let leaderboardScores = [];

// Level configuration
const levelConfig = [
    { rows: 3, cols: 4, speed: 1, fireRate: 0.0025 },     // Level 1
    { rows: 3, cols: 5, speed: 1.05, fireRate: 0.0025 },  // Level 2
    { rows: 3, cols: 6, speed: 1.1, fireRate: 0.0025 },   // Level 3
    { rows: 4, cols: 6, speed: 1.15, fireRate: 0.0025 },  // Level 4
    { rows: 4, cols: 7, speed: 1.20, fireRate: 0.0025 },  // Level 5
    { rows: 4, cols: 8, speed: 1.25, fireRate: 0.002 },   // Level 6
    { rows: 5, cols: 8, speed: 1.30, fireRate: 0.002 },   // Level 7
    { rows: 5, cols: 9, speed: 1.35, fireRate: 0.002 },   // Level 8
    { rows: 5, cols: 10, speed: 1.5, fireRate: 0.002 }    // Level 9 and beyond will maintain this difficulty
];

// Function to update health bar
function updateHealthBar() {
    // Clear existing hearts
    healthContainer.innerHTML = '';
    
    // Add hearts based on current lives
    for (let i = 0; i < maxLives; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        
        // If this heart position exceeds current lives, make it an empty heart
        if (i >= lives) {
            heart.classList.add('heart-empty');
        }
        
        healthContainer.appendChild(heart);
    }
}

// Function to update player appearance based on movement direction
function updatePlayerAppearance(direction) {
    // Only update if direction has changed
    if (playerLastDirection !== direction) {
        playerLastDirection = direction;
        
        // Remove all direction classes
        player.classList.remove('player-left', 'player-right');
        
        // Add appropriate class based on direction
        if (direction === 'left') {
            player.classList.add('player-left');
        } else if (direction === 'right') {
            player.classList.add('player-right');
        }
        // If neutral, no class is needed as the default style applies
    }
}

function createAliens() {
    // Clear any existing aliens
    gameContainer.querySelectorAll('.alien').forEach(el => el.remove());
    aliens = [];
    
    // Get config for current level, cap at the last config if level exceeds config array
    const configIndex = Math.min(currentLevel - 1, levelConfig.length - 1);
    const config = levelConfig[configIndex];
    
    const rows = config.rows;
    const cols = config.cols;
    const alienWidth = 30;
    const alienHeight = 20;
    const spacing = 10;
    
    // Center the alien formation
    const formationWidth = cols * (alienWidth + spacing) - spacing;
    const startX = (gameContainer.offsetWidth - formationWidth) / 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const alien = document.createElement('div');
            alien.className = `alien alien-row-${row % 3 + 1}`;
            
            const alienX = startX + col * (alienWidth + spacing);
            const alienY = row * (alienHeight + spacing) + 60;
            
            alien.style.left = alienX + 'px';
            alien.style.top = alienY + 'px';
            gameContainer.appendChild(alien);
            
            aliens.push({
                element: alien,
                x: alienX,
                y: alienY,
                width: alienWidth,
                height: alienHeight
            });
        }
    }
}

// Initialize the game
function initGame() {
    // Reset game state
    clearInterval(gameLoopInterval);
    gameContainer.querySelectorAll('.alien, .laser, .explosion').forEach(el => el.remove());
    
    score = 0;
    lives = 10;
    currentLevel = 1;
    playerX = 375;
    alienDirection = 1;
    playerLasers = [];
    alienLasers = [];
    aliens = [];
    playerLastDirection = 'neutral';
    currentScoreSaved = false;
    
    // Reset player appearance to neutral
    updatePlayerAppearance('neutral');
    
    document.getElementById('score-value').textContent = score;
    updateHealthBar();
    document.getElementById('level-value').textContent = currentLevel;
    player.style.transform = '';
    playerX = (gameContainer.offsetWidth - player.offsetWidth) / 2;
    player.style.left = playerX + 'px';
    
    // Set initial difficulty based on level 1 config
    alienSpeed = levelConfig[0].speed;
    alienFireRate = levelConfig[0].fireRate;
    
    // Create aliens for level 1
    createAliens();
    
    // Hide screens
    gameOverScreen.style.display = 'none';
    gameStartScreen.style.display = 'none';
    
    // Start game loop
    gameRunning = true;
    gameLoopInterval = setInterval(gameLoop, 16); // ~60 FPS
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    // Track movement direction based on keys - separate from actual movement
    let movementDirection = 'neutral';
    
    if (keysPressed['ArrowLeft']) {
        movementDirection = 'left';
    } else if (keysPressed['ArrowRight']) {
        movementDirection = 'right';
    }
    
    // Update player appearance based on key input, regardless of movement
    updatePlayerAppearance(movementDirection);
    
    // Now actually move the player (only if not at border)
    if (keysPressed['ArrowLeft'] && playerX > 0) {
        playerX -= playerSpeed;
    }
    if (keysPressed['ArrowRight'] && playerX < gameContainer.offsetWidth - player.offsetWidth) {
        playerX += playerSpeed;
    }
    
    // Update player position
    player.style.left = playerX + 'px';
    
    // Shoot
    if (keysPressed[' '] && Date.now() - lastShotTime > shotCooldown) {
        shootLaser();
        lastShotTime = Date.now();
    }
    
    // Move aliens
    moveAliens();
    
    // Alien shooting
    aliensShoot();
    
    // Move lasers
    moveLasers();
    
    // Check collisions
    checkCollisions();
    
    // Check win condition
    if (aliens.length === 0) {
        levelComplete();
    }
}

function moveAliens() {
    let moveDown = false;
    let reachedBottom = false;
    
    // Check if aliens hit the edge
    for (let alien of aliens) {
        const newX = alien.x + alienDirection * alienSpeed;
        if (newX < 0 || newX > gameContainer.offsetWidth - alien.width) {
            moveDown = true;
            break;
        }
        
        // Check if aliens reached the bottom
        if (alien.y + alien.height > player.offsetTop) {
            reachedBottom = true;
        }
    }
    
    if (reachedBottom) {
        lives = 0;
        gameOver();
        return;
    }
    
    // Move aliens
    for (let alien of aliens) {
        if (moveDown) {
            alien.y += alienDownStep;
            alien.element.style.top = alien.y + 'px';
        } else {
            alien.x += alienDirection * alienSpeed;
            alien.element.style.left = alien.x + 'px';
        }
    }
    
    // Change direction if needed
    if (moveDown) {
        alienDirection *= -1;
    }
}

function shootLaser() {
    const laser = document.createElement('div');
    laser.className = 'laser player-laser';
    laser.style.left = (playerX + player.offsetWidth / 2) + 'px';
    laser.style.bottom = '50px';
    gameContainer.appendChild(laser);
    
    playerLasers.push({
        element: laser,
        x: playerX + player.offsetWidth / 2,
        y: gameContainer.offsetHeight - 50
    });
}

function aliensShoot() {
    for (let alien of aliens) {
        if (Math.random() < alienFireRate) {
            const laser = document.createElement('div');
            laser.className = 'laser';
            laser.style.left = (alien.x + alien.width / 2) + 'px';
            laser.style.top = (alien.y + alien.height) + 'px';
            gameContainer.appendChild(laser);
            
            alienLasers.push({
                element: laser,
                x: alien.x + alien.width / 2,
                y: alien.y + alien.height
            });
        }
    }
}

function moveLasers() {
    // Move player lasers
    for (let i = playerLasers.length - 1; i >= 0; i--) {
        const laser = playerLasers[i];
        laser.y -= 10;
        laser.element.style.bottom = (gameContainer.offsetHeight - laser.y) + 'px';
        
        // Remove lasers that are off-screen
        if (laser.y < 0) {
            laser.element.remove();
            playerLasers.splice(i, 1);
        }
    }
    
    // Move alien lasers
    for (let i = alienLasers.length - 1; i >= 0; i--) {
        const laser = alienLasers[i];
        laser.y += 5;
        laser.element.style.top = laser.y + 'px';
        
        // Remove lasers that are off-screen
        if (laser.y > gameContainer.offsetHeight) {
            laser.element.remove();
            alienLasers.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Check player laser hits on aliens
    for (let i = playerLasers.length - 1; i >= 0; i--) {
        const laser = playerLasers[i];
        
        for (let j = aliens.length - 1; j >= 0; j--) {
            const alien = aliens[j];
            
            if (
                laser.x >= alien.x && 
                laser.x <= alien.x + alien.width &&
                laser.y >= alien.y && 
                laser.y <= alien.y + alien.height
            ) {
                // Create explosion
                createExplosion(alien.x, alien.y);
                
                // Remove alien and laser
                alien.element.remove();
                aliens.splice(j, 1);
                
                laser.element.remove();
                playerLasers.splice(i, 1);
                
                // Increase score
                score += 10;
                document.getElementById('score-value').textContent = score;
                
                break;
            }
        }
    }
    
    // Check alien laser hits on player
    for (let i = alienLasers.length - 1; i >= 0; i--) {
        const laser = alienLasers[i];
        
        if (
            laser.x >= playerX && 
            laser.x <= playerX + player.offsetWidth &&
            laser.y >= player.offsetTop && 
            laser.y <= player.offsetTop + player.offsetHeight
        ) {
            // Create explosion
            createExplosion(playerX, player.offsetTop);
            
            // Remove laser
            laser.element.remove();
            alienLasers.splice(i, 1);
            
            // Decrease lives
            lives--;
            updateHealthBar(); // Update heart display when losing a life
            
            if (lives <= 0) {
                gameOver();
            }
            
            break;
        }
    }
}

function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = x + 'px';
    explosion.style.top = y + 'px';
    gameContainer.appendChild(explosion);
    
    // Remove explosion after animation
    setTimeout(() => {
        explosion.remove();
    }, 300);
}

function levelComplete() {
    // Modified to automatically advance to next level without showing a prompt
    gameRunning = false;
    clearInterval(gameLoopInterval);
    
    currentLevel++;
    
    // Clear all lasers
    playerLasers.forEach(laser => laser.element.remove());
    alienLasers.forEach(laser => laser.element.remove());
    playerLasers = [];
    alienLasers = [];
    
    // Short delay before starting next level
    setTimeout(() => {
        nextLevel();
    }, 1000); // 1 second delay before next level
}

function nextLevel() {
    // Update difficulty based on level config
    const configIndex = Math.min(currentLevel - 1, levelConfig.length - 1);
    const config = levelConfig[configIndex];
    
    alienSpeed = config.speed;
    alienFireRate = config.fireRate;
    
    // Update level display
    document.getElementById('level-value').textContent = currentLevel;
    
    // Create new aliens for this level
    createAliens();
    
    // Reset player position
    playerX = (gameContainer.offsetWidth - player.offsetWidth) / 2;
    player.style.left = playerX + 'px';
    
    // Reset player appearance to neutral
    updatePlayerAppearance('neutral');
    
    // Resume game
    gameRunning = true;
    gameLoopInterval = setInterval(gameLoop, 16);
}

function gameOver() {
    gameRunning = false;
    clearInterval(gameLoopInterval);
    currentScoreSaved = false;
    document.getElementById('final-score-value').textContent = score;
    document.getElementById('final-level-value').textContent = currentLevel;
    gameOverScreen.style.display = 'block';
}

// Function to load scores from localStorage
function loadScores() {
    const savedScores = localStorage.getItem('martianMayhemScores');
    if (savedScores) {
        leaderboardScores = JSON.parse(savedScores);
    } else {
        leaderboardScores = [];
    }
}

// Function to save scores to localStorage
function saveScores() {
    localStorage.setItem('martianMayhemScores', JSON.stringify(leaderboardScores));
}

// Function to display the leaderboard
function displayLeaderboard() {
    loadScores();
    
    // Sort scores from highest to lowest
    leaderboardScores.sort((a, b) => b.score - a.score);
    
    // Create leaderboard HTML
    leaderboardList.innerHTML = '';
    
    if (leaderboardScores.length === 0) {
        leaderboardList.innerHTML = '<p>No scores yet!</p>';
    } else {
        // Create table for scores
        const table = document.createElement('table');
        table.className = 'leaderboard-table';
        
        // Add header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
            <th>Level</th>
        `;
        table.appendChild(headerRow);
        
        // Add top 10 scores (or less if fewer exist)
        const scoresToShow = Math.min(leaderboardScores.length, 10);
        for (let i = 0; i < scoresToShow; i++) {
            const score = leaderboardScores[i];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>${score.name}</td>
                <td>${score.score}</td>
                <td>${score.level}</td>
            `;
            table.appendChild(row);
        }
        
        leaderboardList.appendChild(table);
    }
    
    // Show the save score form if the current score isn't saved yet
    if (!currentScoreSaved && score > 0) {
        saveScoreForm.style.display = 'block';
    } else {
        saveScoreForm.style.display = 'none';
    }
}

// Function to save the current score
function saveCurrentScore() {
    const playerName = playerNameInput.value.trim() || 'Anonymous';
    
    leaderboardScores.push({
        name: playerName,
        score: score,
        level: currentLevel,
        date: new Date().toISOString()
    });
    
    // Keep only top 100 scores
    leaderboardScores.sort((a, b) => b.score - a.score);
    if (leaderboardScores.length > 100) {
        leaderboardScores = leaderboardScores.slice(0, 100);
    }
    
    saveScores();
    currentScoreSaved = true;
    
    // Refresh the leaderboard display
    displayLeaderboard();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    
    // Prevent scrolling when using space or arrow keys
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
    
    // Check if arrow keys were released and reset spaceship appearance if needed
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Only reset to neutral if neither arrow key is pressed
        if (!keysPressed['ArrowLeft'] && !keysPressed['ArrowRight']) {
            updatePlayerAppearance('neutral');
        } else if (keysPressed['ArrowLeft']) {
            // If left is still down, make sure we're showing left
            updatePlayerAppearance('left');
        } else if (keysPressed['ArrowRight']) {
            // If right is still down, make sure we're showing right
            updatePlayerAppearance('right');
        }
    }
});

// Audio event listeners
startButton.addEventListener('click', () => {
    initGame();
    bgMusic.play().catch(e => console.log("Autoplay blocked:", e)); // Handle browser autoplay restrictions
});

restartButton.addEventListener('click', () => {
    initGame();
    bgMusic.currentTime = 0; // Rewind to start
    bgMusic.play();
});

// Initial setup - this will run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize player position
    playerX = (gameContainer.offsetWidth - player.offsetWidth) / 2;
    player.style.left = playerX + 'px';
    
    // Initialize heart bar
    updateHealthBar();
    
    // Create aliens but don't start moving them (they will be visible though)
    createAliens();
    
    // Make sure game start screen is visible
    gameStartScreen.style.display = 'flex';
    gameOverScreen.style.display = 'none';
});

// Show start screen (backup in case DOMContentLoaded doesn't fire)
if (document.readyState === 'complete') {
    // Initialize player position
    playerX = (gameContainer.offsetWidth - player.offsetWidth) / 2;
    player.style.left = playerX + 'px';
    
    // Initialize heart bar
    updateHealthBar();
    
    // Create aliens but don't start moving them (they will be visible though)
    createAliens();
    
    // Make sure game start screen is visible
    gameStartScreen.style.display = 'flex';
    gameOverScreen.style.display = 'none';
}

// View scores button click
viewScoresButton.addEventListener('click', () => {
    displayLeaderboard();
    leaderboardOverlay.style.display = 'flex';
});

// Save score button click
saveScoreButton.addEventListener('click', () => {
    saveCurrentScore();
    saveScoreForm.style.display = 'none';
});

// Close leaderboard button click
closeLeaderboardButton.addEventListener('click', () => {
    leaderboardOverlay.style.display = 'none';
});