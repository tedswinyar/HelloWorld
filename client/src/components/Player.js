/**
 * Player class - Handles player character movement, collision detection, and rendering
 * Implements smooth character movement and animation with maze wall collision
 */
export class Player {
    constructor(x, y, mazeRenderer) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.size = 16; // Slightly smaller than cell size for better fit
        this.speed = 2; // Base movement speed
        this.direction = { x: 0, y: 0 }; // Current movement direction
        this.nextDirection = { x: 0, y: 0 }; // Queued direction for smooth turning
        
        // Grid-based movement properties
        this.targetGridX = 0; // Target grid cell X
        this.targetGridY = 0; // Target grid cell Y
        this.isAtIntersection = true; // Whether player is at center of a cell
        this.intersectionThreshold = 5; // Pixels tolerance for intersection detection
        
        // Game state
        this.lives = 3;
        this.score = 0;
        
        // Animation properties
        this.animationTime = 0;
        this.mouthAngle = 0;
        this.mouthSpeed = 0.2; // Speed of mouth animation
        
        // Collision detection
        this.mazeRenderer = mazeRenderer;
        
        // Movement smoothing
        this.targetPosition = { x: this.x, y: this.y };
        this.isMoving = false;
        
        // Initialize grid position
        this.updateGridPosition();
    }
    
    /**
     * Updates player position, handles input, and manages animation
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Handle direction changes and movement
        this.handleMovement(deltaTime);
        
        // Handle maze edge wrapping
        this.handleEdgeWrapping();
    }
    
    /**
     * Updates player animation (mouth movement)
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime * 0.001; // Convert to seconds
        
        // Animate mouth only when moving
        if (this.direction.x !== 0 || this.direction.y !== 0) {
            this.mouthAngle = Math.sin(this.animationTime * this.mouthSpeed * 10) * 0.5 + 0.5;
        } else {
            this.mouthAngle = 0; // Closed mouth when not moving
        }
    }
    
    /**
     * Handles player movement and collision detection
     * @param {number} deltaTime - Time elapsed since last update
     */
    handleMovement(deltaTime) {
        // Update grid position and intersection status
        this.updateGridPosition();
        
        // Try to change direction if a new direction is queued
        if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
            if (this.canMoveInDirection(this.nextDirection)) {
                this.direction = { ...this.nextDirection };
                this.nextDirection = { x: 0, y: 0 };
            } else {
                // If queued direction is invalid, clear it to prevent stopping
                // Player should continue in current direction
                this.nextDirection = { x: 0, y: 0 };
            }
        }
        
        // Calculate new position based on current direction
        if (this.direction.x !== 0 || this.direction.y !== 0) {
            const newX = this.x + this.direction.x * this.speed;
            const newY = this.y + this.direction.y * this.speed;
            
            // Check if movement is valid (no wall collision)
            if (this.canMoveToPosition(newX, newY)) {
                this.x = newX;
                this.y = newY;
                this.isMoving = true;
            } else {
                // If we hit a wall, snap to the center of current cell and stop
                // This prevents stopping midway between cells
                this.snapToNearestGridCenter();
                this.direction = { x: 0, y: 0 };
                this.isMoving = false;
            }
        } else {
            this.isMoving = false;
        }
    }
    
    /**
     * Updates the player's grid position and intersection status
     */
    updateGridPosition() {
        if (!this.mazeRenderer) return;
        
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Use worldToGrid if available, otherwise calculate manually
        let gridPos;
        if (this.mazeRenderer.worldToGrid) {
            gridPos = this.mazeRenderer.worldToGrid(this.x, this.y);
        } else {
            // Fallback calculation
            gridPos = {
                x: Math.floor(this.x / cellSize),
                y: Math.floor(this.y / cellSize)
            };
        }
        
        this.targetGridX = gridPos.x;
        this.targetGridY = gridPos.y;
        
        // Calculate center of current grid cell
        let centerPos;
        if (this.mazeRenderer.gridToWorld) {
            centerPos = this.mazeRenderer.gridToWorld(this.targetGridX, this.targetGridY);
        } else {
            // Fallback calculation
            centerPos = {
                x: this.targetGridX * cellSize + cellSize / 2,
                y: this.targetGridY * cellSize + cellSize / 2
            };
        }
        
        // Check if player is close enough to center to be considered at intersection
        const distanceToCenter = Math.sqrt(
            Math.pow(this.x - centerPos.x, 2) + Math.pow(this.y - centerPos.y, 2)
        );
        
        this.isAtIntersection = distanceToCenter <= this.intersectionThreshold;
    }
    
    /**
     * Snaps the player to the nearest grid center when hitting a wall
     * This prevents stopping midway between cells
     */
    snapToNearestGridCenter() {
        if (!this.mazeRenderer) return;
        
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Calculate the nearest grid center
        const gridX = Math.floor(this.x / cellSize);
        const gridY = Math.floor(this.y / cellSize);
        
        const centerX = gridX * cellSize + cellSize / 2;
        const centerY = gridY * cellSize + cellSize / 2;
        
        this.x = centerX;
        this.y = centerY;
        this.isAtIntersection = true;
    }
    
    /**
     * Checks if player can move in a specific direction
     * @param {Object} direction - Direction vector {x, y}
     * @returns {boolean} True if movement is possible
     */
    canMoveInDirection(direction) {
        const testX = this.x + direction.x * this.speed;
        const testY = this.y + direction.y * this.speed;
        return this.canMoveToPosition(testX, testY);
    }
    
    /**
     * Checks if player can move to a specific position (collision detection)
     * @param {number} x - Target x position
     * @param {number} y - Target y position
     * @returns {boolean} True if position is valid (no collision)
     */
    canMoveToPosition(x, y) {
        if (!this.mazeRenderer) return true;
        
        const halfSize = this.size / 2;
        
        // Check all four corners of the player bounding box
        const corners = [
            { x: x - halfSize, y: y - halfSize }, // Top-left
            { x: x + halfSize, y: y - halfSize }, // Top-right
            { x: x - halfSize, y: y + halfSize }, // Bottom-left
            { x: x + halfSize, y: y + halfSize }  // Bottom-right
        ];
        
        // Check if any corner would be in a wall
        for (const corner of corners) {
            if (this.mazeRenderer.isWallAtPosition(corner.x, corner.y)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Handles player wrapping at maze edges (requirement 1.4)
     */
    handleEdgeWrapping() {
        if (!this.mazeRenderer) return;
        
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        let wrapped = false;
        
        // Horizontal wrapping (left-right edges)
        if (this.x < cellSize / 2) {
            // Check if there's a valid path on the right side for wrapping
            const rightEdgeX = mazeDimensions.width - cellSize / 2;
            if (this.canMoveToPosition(rightEdgeX, this.y)) {
                this.x = rightEdgeX;
                wrapped = true;
            }
        } else if (this.x > mazeDimensions.width - cellSize / 2) {
            // Check if there's a valid path on the left side for wrapping
            const leftEdgeX = cellSize / 2;
            if (this.canMoveToPosition(leftEdgeX, this.y)) {
                this.x = leftEdgeX;
                wrapped = true;
            }
        }
        
        // Vertical wrapping (top-bottom edges) - only if no horizontal wrapping occurred
        if (!wrapped) {
            if (this.y < cellSize / 2) {
                // Check if there's a valid path on the bottom for wrapping
                const bottomEdgeY = mazeDimensions.height - cellSize / 2;
                if (this.canMoveToPosition(this.x, bottomEdgeY)) {
                    this.y = bottomEdgeY;
                    wrapped = true;
                }
            } else if (this.y > mazeDimensions.height - cellSize / 2) {
                // Check if there's a valid path on the top for wrapping
                const topEdgeY = cellSize / 2;
                if (this.canMoveToPosition(this.x, topEdgeY)) {
                    this.y = topEdgeY;
                    wrapped = true;
                }
            }
        }
        
        // Handle corner cases - if both horizontal and vertical wrapping are possible
        if (!wrapped) {
            // Check corner scenarios
            if ((this.x < cellSize / 2 || this.x > mazeDimensions.width - cellSize / 2) &&
                (this.y < cellSize / 2 || this.y > mazeDimensions.height - cellSize / 2)) {
                
                // Prioritize horizontal wrapping for corners
                if (this.x < cellSize / 2) {
                    const rightEdgeX = mazeDimensions.width - cellSize / 2;
                    if (this.canMoveToPosition(rightEdgeX, this.y)) {
                        this.x = rightEdgeX;
                        wrapped = true;
                    }
                } else if (this.x > mazeDimensions.width - cellSize / 2) {
                    const leftEdgeX = cellSize / 2;
                    if (this.canMoveToPosition(leftEdgeX, this.y)) {
                        this.x = leftEdgeX;
                        wrapped = true;
                    }
                }
                
                // If horizontal wrapping didn't work, try vertical
                if (!wrapped) {
                    if (this.y < cellSize / 2) {
                        const bottomEdgeY = mazeDimensions.height - cellSize / 2;
                        if (this.canMoveToPosition(this.x, bottomEdgeY)) {
                            this.y = bottomEdgeY;
                        }
                    } else if (this.y > mazeDimensions.height - cellSize / 2) {
                        const topEdgeY = cellSize / 2;
                        if (this.canMoveToPosition(this.x, topEdgeY)) {
                            this.y = topEdgeY;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Renders the player character with Pac-Man style animation
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {MazeRenderer} mazeRenderer - Maze renderer for coordinate conversion
     */
    render(ctx, mazeRenderer) {
        if (!mazeRenderer) return;
        
        // Convert world position to screen position
        const screenPos = mazeRenderer.worldToScreen(this.x, this.y);
        
        // Player color (classic Pac-Man yellow)
        ctx.fillStyle = '#FFFF00';
        
        // Draw player body (circle)
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.size / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw mouth animation when moving
        if (this.isMoving && (this.direction.x !== 0 || this.direction.y !== 0)) {
            this.renderMouth(ctx, screenPos);
        }
        
        // Add a subtle border for better visibility
        ctx.strokeStyle = '#FFD700'; // Gold border
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.size / 2, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    /**
     * Renders the animated mouth based on movement direction
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} screenPos - Screen position {x, y}
     */
    renderMouth(ctx, screenPos) {
        ctx.fillStyle = '#000000'; // Black mouth
        ctx.beginPath();
        
        // Calculate mouth angle based on direction and animation
        let startAngle = 0;
        let endAngle = 0;
        const mouthSize = Math.PI * 0.6 * this.mouthAngle; // Animated mouth size
        
        if (this.direction.x > 0) { // Moving right
            startAngle = -mouthSize / 2;
            endAngle = mouthSize / 2;
        } else if (this.direction.x < 0) { // Moving left
            startAngle = Math.PI - mouthSize / 2;
            endAngle = Math.PI + mouthSize / 2;
        } else if (this.direction.y > 0) { // Moving down
            startAngle = Math.PI / 2 - mouthSize / 2;
            endAngle = Math.PI / 2 + mouthSize / 2;
        } else if (this.direction.y < 0) { // Moving up
            startAngle = -Math.PI / 2 - mouthSize / 2;
            endAngle = -Math.PI / 2 + mouthSize / 2;
        }
        
        // Draw the mouth (pie slice)
        ctx.arc(screenPos.x, screenPos.y, this.size / 2, startAngle, endAngle);
        ctx.lineTo(screenPos.x, screenPos.y);
        ctx.fill();
    }
    
    /**
     * Sets the player's movement direction (input handling)
     * @param {string} direction - Direction string ('up', 'down', 'left', 'right')
     */
    setDirection(direction) {
        switch (direction) {
            case 'up':
                this.nextDirection = { x: 0, y: -1 };
                // If we can move immediately, set direction now
                if (this.canMoveInDirection(this.nextDirection)) {
                    this.direction = { ...this.nextDirection };
                    this.nextDirection = { x: 0, y: 0 };
                }
                break;
            case 'down':
                this.nextDirection = { x: 0, y: 1 };
                if (this.canMoveInDirection(this.nextDirection)) {
                    this.direction = { ...this.nextDirection };
                    this.nextDirection = { x: 0, y: 0 };
                }
                break;
            case 'left':
                this.nextDirection = { x: -1, y: 0 };
                if (this.canMoveInDirection(this.nextDirection)) {
                    this.direction = { ...this.nextDirection };
                    this.nextDirection = { x: 0, y: 0 };
                }
                break;
            case 'right':
                this.nextDirection = { x: 1, y: 0 };
                if (this.canMoveInDirection(this.nextDirection)) {
                    this.direction = { ...this.nextDirection };
                    this.nextDirection = { x: 0, y: 0 };
                }
                break;
        }
    }
    
    /**
     * Stops the player movement (for game events, not input)
     */
    stop() {
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.isMoving = false;
    }
    
    /**
     * Sets player position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Gets current player position
     * @returns {Object} Position {x, y}
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    /**
     * Gets current movement direction
     * @returns {Object} Direction {x, y}
     */
    getDirection() {
        return { ...this.direction };
    }
    
    /**
     * Checks if player is currently moving
     * @returns {boolean} True if player is moving
     */
    getIsMoving() {
        return this.isMoving;
    }
    
    /**
     * Checks if player is at an intersection (center of grid cell)
     * @returns {boolean} True if player is at intersection
     */
    getIsAtIntersection() {
        return this.isAtIntersection;
    }
    
    /**
     * Gets player size
     * @returns {number} Player size in pixels
     */
    getSize() {
        return this.size;
    }
    
    /**
     * Sets player speed
     * @param {number} speed - New movement speed
     */
    setSpeed(speed) {
        this.speed = Math.max(0, speed);
    }
    
    /**
     * Gets current player speed
     * @returns {number} Current movement speed
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Resets player to initial state
     * @param {number} x - Starting x position
     * @param {number} y - Starting y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.isMoving = false;
        this.animationTime = 0;
        this.mouthAngle = 0;
        this.isAtIntersection = true;
        this.updateGridPosition();
    }
}