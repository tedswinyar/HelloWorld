import { MazeGenerator } from './MazeGenerator.js';
import { MazeRenderer } from './MazeRenderer.js';
import { PelletManager } from './Pellet.js';

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
        
        // Player position (will be set based on maze)
        this.player = {
            x: 50,
            y: 50,
            size: 16, // Slightly smaller than cell size for better fit
            speed: 2,
            direction: { x: 0, y: 0 }
        };
        
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
        // Calculate new player position
        const newX = this.player.x + this.player.direction.x * this.player.speed;
        const newY = this.player.y + this.player.direction.y * this.player.speed;
        
        // Check collision with maze walls
        if (!this.checkWallCollision(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
        }
        
        // Handle maze edge wrapping (requirement 1.4)
        this.handleEdgeWrapping();
        
        // Update pellet system
        this.pelletManager.update(deltaTime);
        
        // Check pellet collisions and handle collection
        this.handlePelletCollection();
        
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
        
        // Render player
        this.renderPlayer();
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
    }
    
    // Input handling methods
    handleInput(direction) {
        // Use the Player class's setDirection method for proper movement handling
        if (this.player && this.player.setDirection) {
            this.player.setDirection(direction);
        } else {
            // Fallback for direct direction setting (if Player class not used)
            switch (direction) {
                case 'up':
                    this.player.direction = { x: 0, y: -1 };
                    break;
                case 'down':
                    this.player.direction = { x: 0, y: 1 };
                    break;
                case 'left':
                    this.player.direction = { x: -1, y: 0 };
                    break;
                case 'right':
                    this.player.direction = { x: 1, y: 0 };
                    break;
            }
        }
    }
    
    // Game state methods
    updateScore(points) {
        this.gameState.score += points;
    }
    
    loseLife() {
        this.gameState.lives--;
        if (this.gameState.lives <= 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.stop();
        console.log('Game Over! Final Score:', this.gameState.score);
        // TODO: Implement proper game over screen
    }
    
    /**
     * Generates a new maze and sets up player position
     */
    generateNewMaze() {
        this.maze = this.mazeGenerator.generate();
        this.mazeRenderer.setMaze(this.maze);
        
        // Generate pellets for the new maze
        this.pelletManager.generatePellets(this.maze);
        
        // Find a suitable starting position for the player (first path cell)
        const accessiblePositions = this.mazeGenerator.getAccessiblePositions(this.maze);
        if (accessiblePositions.length > 0) {
            const startPos = accessiblePositions[0];
            const worldPos = this.mazeRenderer.gridToWorld(startPos.x, startPos.y);
            this.player.x = worldPos.x;
            this.player.y = worldPos.y;
        }
        
        console.log('New maze generated:', this.maze.length, 'x', this.maze[0].length);
        console.log('Pellets generated:', this.pelletManager.getTotalPelletCount());
    }
    
    /**
     * Checks if player would collide with walls at given position
     * @param {number} x - Player x position
     * @param {number} y - Player y position
     * @returns {boolean} True if collision detected
     */
    checkWallCollision(x, y) {
        const halfSize = this.player.size / 2;
        
        // Check all four corners of the player
        const corners = [
            { x: x - halfSize, y: y - halfSize }, // Top-left
            { x: x + halfSize, y: y - halfSize }, // Top-right
            { x: x - halfSize, y: y + halfSize }, // Bottom-left
            { x: x + halfSize, y: y + halfSize }  // Bottom-right
        ];
        
        for (const corner of corners) {
            if (this.mazeRenderer.isWallAtPosition(corner.x, corner.y)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handles player wrapping at maze edges
     */
    handleEdgeWrapping() {
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Horizontal wrapping
        if (this.player.x < cellSize) {
            this.player.x = mazeDimensions.width - cellSize;
        } else if (this.player.x > mazeDimensions.width - cellSize) {
            this.player.x = cellSize;
        }
        
        // Vertical wrapping
        if (this.player.y < cellSize) {
            this.player.y = mazeDimensions.height - cellSize;
        } else if (this.player.y > mazeDimensions.height - cellSize) {
            this.player.y = cellSize;
        }
    }
    
    /**
     * Renders the player character
     */
    renderPlayer() {
        const screenPos = this.mazeRenderer.worldToScreen(this.player.x, this.player.y);
        
        // Render player as a circle (more Pac-Man like)
        this.ctx.fillStyle = '#ffff00'; // Yellow
        this.ctx.beginPath();
        this.ctx.arc(
            screenPos.x, 
            screenPos.y, 
            this.player.size / 2, 
            0, 
            2 * Math.PI
        );
        this.ctx.fill();
        
        // Add a simple mouth effect based on direction
        if (this.player.direction.x !== 0 || this.player.direction.y !== 0) {
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            
            // Calculate mouth angle based on direction
            let startAngle = 0;
            let endAngle = 0;
            
            if (this.player.direction.x > 0) { // Right
                startAngle = Math.PI * 0.2;
                endAngle = Math.PI * 1.8;
            } else if (this.player.direction.x < 0) { // Left
                startAngle = Math.PI * 1.2;
                endAngle = Math.PI * 0.8;
            } else if (this.player.direction.y > 0) { // Down
                startAngle = Math.PI * 0.7;
                endAngle = Math.PI * 1.3;
            } else if (this.player.direction.y < 0) { // Up
                startAngle = Math.PI * 1.7;
                endAngle = Math.PI * 0.3;
            }
            
            this.ctx.arc(
                screenPos.x, 
                screenPos.y, 
                this.player.size / 2, 
                startAngle, 
                endAngle
            );
            this.ctx.lineTo(screenPos.x, screenPos.y);
            this.ctx.fill();
        }
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
        const playerRadius = this.player.size / 2;
        const collectedPellets = this.pelletManager.checkCollisions(
            this.player.x, 
            this.player.y, 
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
     * Handles power pellet collection effects
     */
    handlePowerPelletCollection() {
        // TODO: Implement power pellet effects (enemy vulnerability)
        console.log('Power pellet collected! Enemies become vulnerable.');
        
        // For now, just give bonus points
        this.updateScore(50); // Bonus points for power pellet
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
        this.player.speed = Math.min(maxSpeed, this.player.speed + speedIncrease);
        
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
        
        console.log(`Difficulty increased - Speed: ${this.player.speed.toFixed(1)}, Pellet Density: ${newDensity.toFixed(2)}`);
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
        
        // Reset player properties
        this.player.speed = 2;
        this.player.direction = { x: 0, y: 0 };
        
        // Reset maze generator to initial size
        this.mazeGenerator = new MazeGenerator(41, 31);
        this.pelletManager = new PelletManager(this.mazeGenerator, this.mazeRenderer);
        
        // Reset pellet manager properties
        this.pelletManager.normalPelletDensity = 0.7;
        this.pelletManager.powerPelletCount = 4;
        
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
            playerSpeed: this.player.speed,
            mazeSize: {
                width: this.mazeGenerator.width,
                height: this.mazeGenerator.height
            },
            pelletDensity: this.pelletManager.normalPelletDensity,
            powerPelletCount: this.pelletManager.powerPelletCount
        };
    }
    
    /**
     * Gets the pellet manager
     * @returns {PelletManager} Pellet manager instance
     */
    getPelletManager() {
        return this.pelletManager;
    }
}