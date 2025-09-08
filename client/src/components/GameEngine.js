import { MazeGenerator } from './MazeGenerator.js';
import { MazeRenderer } from './MazeRenderer.js';
import { PelletManager } from './Pellet.js';
import { Player } from './Player.js';
import { AIController } from './AIController.js';

export class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isRunning = false;
        this.lastTime = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        
        // Game state
        this.gameState = {
            score: 0,
            lives: 3,
            level: 1
        };
        
        // Initialize maze system
        this.mazeGenerator = new MazeGenerator(41, 31); // Reasonable maze size
        this.mazeRenderer = new MazeRenderer(canvas, ctx);
        this.maze = null;
        
        // Initialize pellet system
        this.pelletManager = new PelletManager(this.mazeGenerator, this.mazeRenderer);
        
        // Initialize player
        this.player = new Player(50, 50, this.mazeRenderer);
        
        // Initialize AI controller for enemies
        this.aiController = new AIController(this.mazeRenderer);
        
        // Collision and life management
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 2000; // 2 seconds of invulnerability after hit
        this.respawnDelay = 1000; // 1 second delay before respawn
        this.isRespawning = false;
        
        // Power pellet effects
        this.powerPelletEndTime = null;
        
        // Initialize maze
        this.generateNewMaze();
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
            console.log('Game started');
        }
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game stopped');
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameInterval) {
            this.update(deltaTime);
            this.render();
            this.lastTime = currentTime - (deltaTime % this.frameInterval);
        }
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // Skip updates if game is over or respawning
        if (!this.isRunning || this.isRespawning) {
            return;
        }
        
        // Update invulnerability timer
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
        }
        
        // Update player
        this.player.update(deltaTime);
        
        // Update pellet system
        this.pelletManager.update(deltaTime);
        
        // Check pellet collisions and handle collection
        this.handlePelletCollection();
        
        // Update AI controller and enemies
        this.aiController.update(deltaTime, this.player.getPosition(), {
            level: this.gameState.level,
            playerDirection: this.player.getDirection()
        });
        
        // Check enemy-player collisions (requirement 3.2, 3.3)
        this.handleEnemyCollisions();
        
        // Update camera to follow player
        this.mazeRenderer.updateCamera(this.player.x, this.player.y);
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        // Render maze
        this.mazeRenderer.render();
        
        // Render pellets
        this.pelletManager.render(this.ctx);
        
        // Render enemies
        this.aiController.render(this.ctx);
        
        // Render player (with invulnerability effect if applicable)
        this.renderPlayer();
        
        // Render game over screen if needed
        if (this.gameState.lives <= 0) {
            this.renderGameOverScreen();
        }
    }
    
    updateUI() {
        const scoreElement = document.getElementById('score-value');
        const livesElement = document.getElementById('lives-value');
        const levelElement = document.getElementById('level-value');
        const pelletsElement = document.getElementById('pellets-remaining');
        
        if (scoreElement) scoreElement.textContent = this.gameState.score;
        if (livesElement) livesElement.textContent = this.gameState.lives;
        if (levelElement) levelElement.textContent = this.gameState.level;
        if (pelletsElement) pelletsElement.textContent = this.pelletManager.getRemainingPelletCount();
        
        // Update power pellet status indicator
        this.updatePowerPelletStatus();
    }
    
    /**
     * Updates power pellet status indicator in UI
     */
    updatePowerPelletStatus() {
        const powerStatusElement = document.getElementById('power-status');
        
        if (powerStatusElement) {
            if (this.powerPelletEndTime && Date.now() < this.powerPelletEndTime) {
                const remainingTime = Math.ceil((this.powerPelletEndTime - Date.now()) / 1000);
                powerStatusElement.textContent = `POWER MODE: ${remainingTime}s`;
                powerStatusElement.style.color = remainingTime > 3 ? '#00FF00' : '#FF0000';
                powerStatusElement.style.display = 'block';
            } else {
                powerStatusElement.style.display = 'none';
                this.powerPelletEndTime = null;
            }
        }
    }
    
    // Input handling methods
    handleInput(direction) {
        // Only handle input if game is running and not respawning
        if (!this.isRunning || this.isRespawning) {
            return;
        }
        
        this.player.setDirection(direction);
    }
    
    // Game state methods
    updateScore(points) {
        this.gameState.score += points;
    }
    
    /**
     * Handles player losing a life (requirement 3.2, 3.3)
     */
    loseLife() {
        this.gameState.lives--;
        console.log(`Life lost! Lives remaining: ${this.gameState.lives}`);
        
        if (this.gameState.lives <= 0) {
            this.gameOver();
        } else {
            this.respawnPlayer();
        }
    }
    
    /**
     * Handles player respawn after losing a life (requirement 7.4)
     */
    respawnPlayer() {
        this.isRespawning = true;
        
        // Stop player movement
        this.player.stop();
        
        // Set invulnerability period
        this.invulnerabilityTime = this.invulnerabilityDuration;
        
        // Reset player to starting position after delay
        setTimeout(() => {
            this.resetPlayerPosition();
            this.isRespawning = false;
            console.log('Player respawned with invulnerability');
        }, this.respawnDelay);
    }
    
    /**
     * Resets player to starting position
     */
    resetPlayerPosition() {
        // Find a suitable starting position for the player (first path cell)
        const accessiblePositions = this.mazeGenerator.getAccessiblePositions(this.maze);
        if (accessiblePositions.length > 0) {
            const startPos = accessiblePositions[0];
            const worldPos = this.mazeRenderer.gridToWorld(startPos.x, startPos.y);
            this.player.setPosition(worldPos.x, worldPos.y);
        }
    }
    
    /**
     * Handles game over state (requirement 7.4)
     */
    gameOver() {
        this.stop();
        console.log('Game Over! Final Score:', this.gameState.score);
        
        // Stop AI controller
        this.aiController.setActive(false);
        
        // Show game over screen
        this.showGameOverScreen();
    }
    
    /**
     * Shows game over screen with restart option
     */
    showGameOverScreen() {
        // This will be rendered in the render method
        console.log('Showing game over screen');
        
        // Auto-restart after 5 seconds (can be made configurable)
        setTimeout(() => {
            if (this.gameState.lives <= 0) {
                this.resetGame();
                this.start();
            }
        }, 5000);
    }
    
    /**
     * Generates a new maze and sets up player position
     */
    generateNewMaze() {
        this.maze = this.mazeGenerator.generate();
        this.mazeRenderer.setMaze(this.maze);
        
        // Generate pellets for the new maze
        this.pelletManager.generatePellets(this.maze);
        
        // Reset player position
        this.resetPlayerPosition();
        
        // Update AI controller with new maze
        this.aiController.setMazeRenderer(this.mazeRenderer);
        this.aiController.reset();
        this.aiController.setDifficultyLevel(this.gameState.level);
        
        console.log('New maze generated:', this.maze.length, 'x', this.maze[0].length);
        console.log('Pellets generated:', this.pelletManager.getTotalPelletCount());
    }
    

    
    /**
     * Renders the player character with invulnerability effects
     */
    renderPlayer() {
        // Apply invulnerability flashing effect
        if (this.invulnerabilityTime > 0) {
            const flashRate = 200; // milliseconds
            const shouldShow = Math.floor(this.invulnerabilityTime / flashRate) % 2 === 0;
            if (!shouldShow) {
                return; // Skip rendering to create flashing effect
            }
        }
        
        // Use Player class render method
        this.player.render(this.ctx, this.mazeRenderer);
        
        // Add invulnerability indicator
        if (this.invulnerabilityTime > 0) {
            this.renderInvulnerabilityIndicator();
        }
    }
    
    /**
     * Renders invulnerability indicator around player
     */
    renderInvulnerabilityIndicator() {
        const playerPos = this.player.getPosition();
        const screenPos = this.mazeRenderer.worldToScreen(playerPos.x, playerPos.y);
        
        this.ctx.strokeStyle = '#00FFFF'; // Cyan glow
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, this.player.getSize() / 2 + 5, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    /**
     * Renders game over screen
     */
    renderGameOverScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Final score
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(`Final Score: ${this.gameState.score}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // Restart message
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Restarting in a few seconds...', this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        // Reset text alignment
        this.ctx.textAlign = 'left';
    }
    
    /**
     * Gets the current maze
     * @returns {number[][]} Current maze array
     */
    getMaze() {
        return this.maze;
    }
    
    /**
     * Gets the maze renderer
     * @returns {MazeRenderer} Maze renderer instance
     */
    getMazeRenderer() {
        return this.mazeRenderer;
    }
    
    /**
     * Handles pellet collection when player collides with pellets
     */
    handlePelletCollection() {
        const playerPos = this.player.getPosition();
        const playerRadius = this.player.getSize() / 2;
        const collectedPellets = this.pelletManager.checkCollisions(
            playerPos.x, 
            playerPos.y, 
            playerRadius
        );
        
        // Process collected pellets
        for (const pellet of collectedPellets) {
            this.updateScore(pellet.getPoints());
            
            // Handle power pellet effects
            if (pellet.getType() === 'power') {
                this.handlePowerPelletCollection();
            }
            
            console.log(`Collected ${pellet.getType()} pellet for ${pellet.getPoints()} points`);
        }
        
        // Check if all pellets collected (level completion)
        // Only trigger level completion if we actually had pellets to collect
        if (this.pelletManager.areAllPelletsCollected() && this.pelletManager.getTotalPelletCount() > 0) {
            this.handleLevelComplete();
        }
    }
    
    /**
     * Handles power pellet collection effects (requirement 2.4)
     */
    handlePowerPelletCollection() {
        console.log('Power pellet collected! Enemies become vulnerable.');
        
        // Calculate vulnerability duration based on level (shorter at higher levels)
        const baseDuration = 10000; // 10 seconds
        const levelReduction = Math.min(3000, (this.gameState.level - 1) * 200); // Reduce by up to 3 seconds
        const vulnerabilityDuration = Math.max(5000, baseDuration - levelReduction); // Minimum 5 seconds
        
        // Make all enemies vulnerable
        this.aiController.setAllEnemiesVulnerable(true, vulnerabilityDuration);
        
        // Give bonus points for power pellet
        this.updateScore(50);
        
        // Store vulnerability end time for UI feedback
        this.powerPelletEndTime = Date.now() + vulnerabilityDuration;
        
        console.log(`Enemies vulnerable for ${vulnerabilityDuration / 1000} seconds`);
    }
    
    /**
     * Handles enemy-player collision detection (requirement 3.2, 3.3)
     */
    handleEnemyCollisions() {
        // Skip collision detection during invulnerability period
        if (this.invulnerabilityTime > 0) {
            return;
        }
        
        const playerPos = this.player.getPosition();
        const playerSize = this.player.getSize();
        
        // Check collisions with all enemies
        const collidingEnemies = this.aiController.checkPlayerCollisions(playerPos, playerSize);
        
        for (const enemy of collidingEnemies) {
            if (enemy.getIsVulnerable()) {
                // Player eats vulnerable enemy (requirement 3.4)
                this.handleVulnerableEnemyCollision(enemy);
            } else {
                // Enemy hits player - lose life (requirement 3.2, 3.3)
                this.handleEnemyHitPlayer(enemy);
                break; // Only process one collision per frame
            }
        }
    }
    
    /**
     * Handles collision with vulnerable enemy (player eats enemy)
     * @param {Enemy} enemy - The vulnerable enemy that was eaten
     */
    handleVulnerableEnemyCollision(enemy) {
        // Award points for eating enemy
        const points = this.getEnemyPoints(enemy.getType());
        this.updateScore(points);
        
        // Remove the enemy
        this.aiController.removeEnemy(enemy);
        
        console.log(`Ate ${enemy.getType()} enemy for ${points} points!`);
    }
    
    /**
     * Handles enemy hitting player (player loses life)
     * @param {Enemy} enemy - The enemy that hit the player
     */
    handleEnemyHitPlayer(enemy) {
        console.log(`Hit by ${enemy.getType()} enemy!`);
        
        // Lose a life
        this.loseLife();
    }
    
    /**
     * Gets points awarded for eating different enemy types
     * @param {string} enemyType - Type of enemy
     * @returns {number} Points awarded
     */
    getEnemyPoints(enemyType) {
        const pointValues = {
            'chaser': 200,
            'ambusher': 400,
            'patrol': 300,
            'random': 100,
            'ghost': 200
        };
        
        return pointValues[enemyType] || 200;
    }
    
    /**
     * Handles level completion when all pellets are collected
     */
    handleLevelComplete() {
        console.log('Level complete! All pellets collected.');
        
        // Only award bonus and advance level if this isn't the initial setup
        if (this.pelletManager.getTotalPelletCount() > 0) {
            // Award level completion bonus
            const levelBonus = this.gameState.level * 100;
            this.updateScore(levelBonus);
            
            // Advance to next level
            this.gameState.level++;
            
            // Increase difficulty for next level
            this.increaseDifficulty();
            
            console.log(`Advanced to level ${this.gameState.level}`);
        }
        
        // Generate new maze for next level
        this.generateNewMaze();
    }
    
    /**
     * Increases game difficulty based on current level
     */
    increaseDifficulty() {
        // Increase player speed slightly (but cap it)
        const maxSpeed = 4;
        const speedIncrease = 0.1;
        const currentSpeed = this.player.getSpeed();
        this.player.setSpeed(Math.min(maxSpeed, currentSpeed + speedIncrease));
        
        // Increase maze size for higher levels (but cap it for performance)
        const maxMazeWidth = 61;
        const maxMazeHeight = 41;
        const currentWidth = this.mazeGenerator.width;
        const currentHeight = this.mazeGenerator.height;
        
        if (this.gameState.level % 3 === 0) { // Every 3 levels
            const newWidth = Math.min(maxMazeWidth, currentWidth + 4);
            const newHeight = Math.min(maxMazeHeight, currentHeight + 2);
            
            if (newWidth !== currentWidth || newHeight !== currentHeight) {
                this.mazeGenerator = new MazeGenerator(newWidth, newHeight);
                this.pelletManager = new PelletManager(this.mazeGenerator, this.mazeRenderer);
                console.log(`Maze size increased to ${newWidth}x${newHeight}`);
            }
        }
        
        // Adjust pellet density (fewer pellets = more challenging)
        const minDensity = 0.4;
        const densityDecrease = 0.02;
        const newDensity = Math.max(minDensity, this.pelletManager.normalPelletDensity - densityDecrease);
        this.pelletManager.normalPelletDensity = newDensity;
        
        // Increase power pellet count for higher levels
        const maxPowerPellets = 6;
        if (this.gameState.level % 5 === 0) { // Every 5 levels
            this.pelletManager.powerPelletCount = Math.min(maxPowerPellets, this.pelletManager.powerPelletCount + 1);
        }
        
        // Update AI difficulty
        this.aiController.setDifficultyLevel(this.gameState.level);
        
        console.log(`Difficulty increased - Speed: ${this.player.getSpeed().toFixed(1)}, Pellet Density: ${newDensity.toFixed(2)}`);
    }
    
    /**
     * Resets game to initial state for new game
     */
    resetGame() {
        // Reset game state
        this.gameState = {
            score: 0,
            lives: 3,
            level: 1
        };
        
        // Reset collision and respawn state
        this.invulnerabilityTime = 0;
        this.isRespawning = false;
        
        // Reset player properties
        this.player.setSpeed(2);
        this.player.stop();
        
        // Reset maze generator to initial size
        this.mazeGenerator = new MazeGenerator(41, 31);
        this.pelletManager = new PelletManager(this.mazeGenerator, this.mazeRenderer);
        
        // Reset pellet manager properties
        this.pelletManager.normalPelletDensity = 0.7;
        this.pelletManager.powerPelletCount = 4;
        
        // Reset AI controller
        this.aiController.reset();
        this.aiController.setActive(true);
        this.aiController.setDifficultyLevel(1);
        
        // Generate initial maze
        this.generateNewMaze();
        
        console.log('Game reset to initial state');
    }
    
    /**
     * Gets current level information
     * @returns {Object} Level information
     */
    getLevelInfo() {
        return {
            level: this.gameState.level,
            playerSpeed: this.player.getSpeed(),
            mazeSize: {
                width: this.mazeGenerator.width,
                height: this.mazeGenerator.height
            },
            pelletDensity: this.pelletManager.normalPelletDensity,
            powerPelletCount: this.pelletManager.powerPelletCount,
            enemyCount: this.aiController.getEnemies().length,
            enemyStats: this.aiController.getEnemyStats()
        };
    }
    
    /**
     * Gets the AI controller
     * @returns {AIController} AI controller instance
     */
    getAIController() {
        return this.aiController;
    }
    
    /**
     * Gets the player instance
     * @returns {Player} Player instance
     */
    getPlayer() {
        return this.player;
    }
    
    /**
     * Gets the pellet manager
     * @returns {PelletManager} Pellet manager instance
     */
    getPelletManager() {
        return this.pelletManager;
    }
}