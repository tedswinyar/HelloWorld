import { MazeGenerator } from './MazeGenerator.js';
import { MazeRenderer } from './MazeRenderer.js';

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
        
        // Update camera to follow player
        this.mazeRenderer.updateCamera(this.player.x, this.player.y);
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        // Render maze
        this.mazeRenderer.render();
        
        // Render player
        this.renderPlayer();
    }
    
    updateUI() {
        const scoreElement = document.getElementById('score-value');
        const livesElement = document.getElementById('lives-value');
        
        if (scoreElement) scoreElement.textContent = this.gameState.score;
        if (livesElement) livesElement.textContent = this.gameState.lives;
    }
    
    // Input handling methods
    handleInput(direction) {
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
            case 'stop':
                this.player.direction = { x: 0, y: 0 };
                break;
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
        
        // Find a suitable starting position for the player (first path cell)
        const accessiblePositions = this.mazeGenerator.getAccessiblePositions(this.maze);
        if (accessiblePositions.length > 0) {
            const startPos = accessiblePositions[0];
            const worldPos = this.mazeRenderer.gridToWorld(startPos.x, startPos.y);
            this.player.x = worldPos.x;
            this.player.y = worldPos.y;
        }
        
        console.log('New maze generated:', this.maze.length, 'x', this.maze[0].length);
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
}