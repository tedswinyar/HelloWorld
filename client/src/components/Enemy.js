/**
 * Enemy class - Handles enemy character movement, AI pathfinding, and rendering
 * Implements A* pathfinding algorithm for intelligent enemy behavior
 */
export class Enemy {
    constructor(x, y, mazeRenderer, type = 'ghost') {
        // Position and movement
        this.x = x;
        this.y = y;
        this.size = 16; // Same size as player for consistent collision
        this.speed = 1.5; // Slightly slower than player base speed
        this.direction = { x: 0, y: 0 }; // Current movement direction
        this.targetDirection = { x: 0, y: 0 }; // Target direction from pathfinding
        
        // Grid-based movement properties
        this.gridX = 0;
        this.gridY = 0;
        this.isAtIntersection = true;
        this.intersectionThreshold = 5;
        
        // AI properties
        this.type = type; // 'ghost', 'chaser', 'ambusher', etc.
        this.state = 'chase'; // 'chase', 'vulnerable', 'returning'
        this.targetPosition = { x: 0, y: 0 }; // Current pathfinding target
        this.path = []; // Current path from A* algorithm
        this.pathIndex = 0; // Current position in path
        this.lastPathUpdate = 0; // Time since last pathfinding update
        this.pathUpdateInterval = 500; // Update path every 500ms
        
        // Vulnerability state (for power pellet effects)
        this.isVulnerable = false;
        this.vulnerabilityTimer = 0;
        this.vulnerabilityDuration = 10000; // 10 seconds
        
        // Animation properties
        this.animationTime = 0;
        this.animationSpeed = 0.1;
        
        // Collision detection
        this.mazeRenderer = mazeRenderer;
        
        // Behavior properties based on type
        this.setBehaviorByType(type);
        
        // Initialize grid position
        this.updateGridPosition();
    }
    
    /**
     * Sets enemy behavior properties based on type
     * @param {string} type - Enemy type
     */
    setBehaviorByType(type) {
        switch (type) {
            case 'chaser':
                this.speed = 1.8;
                this.color = '#FF0000'; // Red
                this.pathUpdateInterval = 300; // More aggressive pathfinding
                break;
            case 'ambusher':
                this.speed = 1.6;
                this.color = '#FFB6C1'; // Pink
                this.pathUpdateInterval = 600; // Less frequent updates for ambush behavior
                break;
            case 'patrol':
                this.speed = 1.4;
                this.color = '#00FFFF'; // Cyan
                this.pathUpdateInterval = 800; // Slower, more predictable
                break;
            case 'random':
                this.speed = 1.3;
                this.color = '#FFA500'; // Orange
                this.pathUpdateInterval = 1000; // Random movement
                break;
            default: // 'ghost'
                this.speed = 1.5;
                this.color = '#FF69B4'; // Hot pink
                this.pathUpdateInterval = 500;
                break;
        }
        
        // Store original color for vulnerability state changes
        this.originalColor = this.color;
    }
    
    /**
     * Updates enemy position, AI behavior, and animation
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} playerPosition - Player's current position {x, y}
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, playerPosition, gameState = {}) {
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update vulnerability state
        this.updateVulnerabilityState(deltaTime);
        
        // Update AI behavior
        this.updateAI(deltaTime, playerPosition, gameState);
        
        // Handle movement
        this.handleMovement(deltaTime);
        
        // Handle maze edge wrapping
        this.handleEdgeWrapping();
    }
    
    /**
     * Updates enemy animation
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime * 0.001; // Convert to seconds
    }
    
    /**
     * Updates vulnerability state from power pellet effects
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateVulnerabilityState(deltaTime) {
        if (this.isVulnerable) {
            this.vulnerabilityTimer -= deltaTime;
            
            if (this.vulnerabilityTimer <= 0) {
                this.setVulnerable(false);
                return; // Exit early after setting vulnerable to false
            }
            
            // Enhanced visual indicators for vulnerable state
            if (this.vulnerabilityTimer > 3000) {
                // First phase: solid blue (safe to eat)
                this.color = '#0000FF';
            } else if (this.vulnerabilityTimer > 1000) {
                // Second phase: flashing blue/white (warning)
                const flashRate = 300;
                this.color = Math.floor(this.vulnerabilityTimer / flashRate) % 2 === 0 ? '#0000FF' : '#FFFFFF';
            } else {
                // Final phase: rapid flashing (about to become invulnerable)
                const rapidFlashRate = 100;
                this.color = Math.floor(this.vulnerabilityTimer / rapidFlashRate) % 2 === 0 ? '#0000FF' : this.originalColor;
            }
        }
    }
    
    /**
     * Updates AI behavior and pathfinding
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} playerPosition - Player's current position {x, y}
     * @param {Object} gameState - Current game state
     */
    updateAI(deltaTime, playerPosition, gameState) {
        this.lastPathUpdate += deltaTime;
        
        // Update pathfinding periodically
        if (this.lastPathUpdate >= this.pathUpdateInterval) {
            this.updatePathfinding(playerPosition, gameState);
            this.lastPathUpdate = 0;
        }
        
        // Follow current path
        this.followPath();
    }
    
    /**
     * Updates pathfinding target and calculates new path
     * @param {Object} playerPosition - Player's current position {x, y}
     * @param {Object} gameState - Current game state
     */
    updatePathfinding(playerPosition, gameState) {
        if (!this.mazeRenderer) return;
        
        let targetPos = { ...playerPosition };
        
        // Adjust target based on enemy type and state
        if (this.isVulnerable) {
            // When vulnerable, try to avoid player
            targetPos = this.getAvoidanceTarget(playerPosition);
        } else {
            targetPos = this.getBehaviorTarget(playerPosition, gameState);
        }
        
        // Convert world position to grid position
        const currentGrid = this.mazeRenderer.worldToGrid(this.x, this.y);
        const targetGrid = this.mazeRenderer.worldToGrid(targetPos.x, targetPos.y);
        
        // Calculate path using A* algorithm
        this.path = this.findPathAStar(currentGrid, targetGrid);
        this.pathIndex = 0;
        
        this.targetPosition = targetPos;
    }
    
    /**
     * Gets behavior-specific target position
     * @param {Object} playerPosition - Player's current position {x, y}
     * @param {Object} gameState - Current game state
     * @returns {Object} Target position {x, y}
     */
    getBehaviorTarget(playerPosition, gameState) {
        switch (this.type) {
            case 'chaser':
                // Direct chase - target player position
                return { ...playerPosition };
                
            case 'ambusher':
                // Try to get ahead of player based on their direction
                const playerDir = gameState.playerDirection || { x: 0, y: 0 };
                const ambushDistance = 100; // pixels ahead
                return {
                    x: playerPosition.x + playerDir.x * ambushDistance,
                    y: playerPosition.y + playerDir.y * ambushDistance
                };
                
            case 'patrol':
                // Patrol between corners or specific points
                return this.getPatrolTarget();
                
            case 'random':
                // Random movement - pick random accessible position
                return this.getRandomTarget();
                
            default: // 'ghost'
                // Standard ghost behavior - chase with some randomness
                const randomOffset = 50;
                return {
                    x: playerPosition.x + (Math.random() - 0.5) * randomOffset,
                    y: playerPosition.y + (Math.random() - 0.5) * randomOffset
                };
        }
    }
    
    /**
     * Gets avoidance target when enemy is vulnerable
     * @param {Object} playerPosition - Player's current position {x, y}
     * @returns {Object} Target position {x, y}
     */
    getAvoidanceTarget(playerPosition) {
        // Try to move away from player
        const avoidanceDistance = 200;
        const directionFromPlayer = {
            x: this.x - playerPosition.x,
            y: this.y - playerPosition.y
        };
        
        // Normalize direction
        const length = Math.sqrt(directionFromPlayer.x ** 2 + directionFromPlayer.y ** 2);
        if (length > 0) {
            directionFromPlayer.x /= length;
            directionFromPlayer.y /= length;
        }
        
        return {
            x: this.x + directionFromPlayer.x * avoidanceDistance,
            y: this.y + directionFromPlayer.y * avoidanceDistance
        };
    }
    
    /**
     * Gets patrol target for patrol-type enemies
     * @returns {Object} Target position {x, y}
     */
    getPatrolTarget() {
        // Simple patrol behavior - move between corners
        if (!this.patrolPoints) {
            this.patrolPoints = this.getPatrolPoints();
            this.currentPatrolIndex = 0;
        }
        
        if (this.patrolPoints.length === 0) {
            return { x: this.x, y: this.y };
        }
        
        const target = this.patrolPoints[this.currentPatrolIndex];
        const distance = Math.sqrt((this.x - target.x) ** 2 + (this.y - target.y) ** 2);
        
        // If close to current patrol point, move to next
        if (distance < 30) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        
        return this.patrolPoints[this.currentPatrolIndex];
    }
    
    /**
     * Gets random target for random-type enemies
     * @returns {Object} Target position {x, y}
     */
    getRandomTarget() {
        if (!this.mazeRenderer) return { x: this.x, y: this.y };
        
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Pick a random accessible position
        let attempts = 0;
        let targetX, targetY;
        
        do {
            targetX = Math.random() * (mazeDimensions.width - cellSize * 2) + cellSize;
            targetY = Math.random() * (mazeDimensions.height - cellSize * 2) + cellSize;
            attempts++;
        } while (this.mazeRenderer.isWallAtPosition(targetX, targetY) && attempts < 10);
        
        return { x: targetX, y: targetY };
    }
    
    /**
     * Gets patrol points for patrol behavior
     * @returns {Array} Array of patrol points {x, y}
     */
    getPatrolPoints() {
        if (!this.mazeRenderer) return [];
        
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Define corner points for patrol
        const corners = [
            { x: cellSize * 2, y: cellSize * 2 },
            { x: mazeDimensions.width - cellSize * 2, y: cellSize * 2 },
            { x: mazeDimensions.width - cellSize * 2, y: mazeDimensions.height - cellSize * 2 },
            { x: cellSize * 2, y: mazeDimensions.height - cellSize * 2 }
        ];
        
        // Filter out corners that are walls
        return corners.filter(corner => !this.mazeRenderer.isWallAtPosition(corner.x, corner.y));
    }
    
    /**
     * A* pathfinding algorithm implementation
     * @param {Object} start - Start grid position {x, y}
     * @param {Object} goal - Goal grid position {x, y}
     * @returns {Array} Path as array of grid positions
     */
    findPathAStar(start, goal) {
        if (!this.mazeRenderer) return [];
        
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(this.gridKey(start), 0);
        fScore.set(this.gridKey(start), this.heuristic(start, goal));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(this.gridKey(openSet[i])) < fScore.get(this.gridKey(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove current from openSet
            openSet.splice(currentIndex, 1);
            closedSet.add(this.gridKey(current));
            
            // Check if we reached the goal
            if (current.x === goal.x && current.y === goal.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            // Check neighbors
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.gridKey(neighbor);
                
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeGScore = gScore.get(this.gridKey(current)) + 1;
                
                if (!openSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighborKey)) {
                    continue;
                }
                
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
            }
        }
        
        // No path found
        return [];
    }
    
    /**
     * Reconstructs path from A* algorithm result
     * @param {Map} cameFrom - Map of previous nodes
     * @param {Object} current - Current node
     * @returns {Array} Path as array of grid positions
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        
        while (cameFrom.has(this.gridKey(current))) {
            current = cameFrom.get(this.gridKey(current));
            path.unshift(current);
        }
        
        return path;
    }
    
    /**
     * Gets valid neighbors for A* pathfinding
     * @param {Object} node - Current grid node {x, y}
     * @returns {Array} Array of valid neighbor nodes
     */
    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: node.x + dir.x,
                y: node.y + dir.y
            };
            
            // Check if neighbor is valid (not a wall)
            const worldPos = this.mazeRenderer.gridToWorld(neighbor.x, neighbor.y);
            if (!this.mazeRenderer.isWallAtPosition(worldPos.x, worldPos.y)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Heuristic function for A* (Manhattan distance)
     * @param {Object} a - First position {x, y}
     * @param {Object} b - Second position {x, y}
     * @returns {number} Heuristic distance
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    /**
     * Creates a unique key for grid positions
     * @param {Object} pos - Grid position {x, y}
     * @returns {string} Unique key
     */
    gridKey(pos) {
        return `${pos.x},${pos.y}`;
    }
    
    /**
     * Follows the current calculated path
     */
    followPath() {
        if (this.path.length === 0 || this.pathIndex >= this.path.length) {
            this.targetDirection = { x: 0, y: 0 };
            return;
        }
        
        const targetGrid = this.path[this.pathIndex];
        const targetWorld = this.mazeRenderer.gridToWorld(targetGrid.x, targetGrid.y);
        
        // Calculate direction to next path point
        const dx = targetWorld.x - this.x;
        const dy = targetWorld.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If close to current path point, move to next
        if (distance < 10) {
            this.pathIndex++;
            if (this.pathIndex < this.path.length) {
                const nextTarget = this.path[this.pathIndex];
                const nextWorld = this.mazeRenderer.gridToWorld(nextTarget.x, nextTarget.y);
                const nextDx = nextWorld.x - this.x;
                const nextDy = nextWorld.y - this.y;
                const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
                
                this.targetDirection = {
                    x: nextDistance > 0 ? nextDx / nextDistance : 0,
                    y: nextDistance > 0 ? nextDy / nextDistance : 0
                };
            }
        } else {
            // Move toward current path point
            this.targetDirection = {
                x: distance > 0 ? dx / distance : 0,
                y: distance > 0 ? dy / distance : 0
            };
        }
    }
    
    /**
     * Handles enemy movement based on AI direction
     * @param {number} deltaTime - Time elapsed since last update
     */
    handleMovement(deltaTime) {
        // Update grid position
        this.updateGridPosition();
        
        // Apply target direction to current direction with some smoothing
        const smoothing = 0.1;
        this.direction.x += (this.targetDirection.x - this.direction.x) * smoothing;
        this.direction.y += (this.targetDirection.y - this.direction.y) * smoothing;
        
        // Calculate new position
        const newX = this.x + this.direction.x * this.speed;
        const newY = this.y + this.direction.y * this.speed;
        
        // Check if movement is valid (no wall collision)
        if (this.canMoveToPosition(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // If we hit a wall, try to find alternative direction
            this.handleWallCollision();
        }
    }
    
    /**
     * Updates the enemy's grid position
     */
    updateGridPosition() {
        if (!this.mazeRenderer) return;
        
        const gridPos = this.mazeRenderer.worldToGrid(this.x, this.y);
        this.gridX = gridPos.x;
        this.gridY = gridPos.y;
        
        // Calculate center of current grid cell
        const centerPos = this.mazeRenderer.gridToWorld(this.gridX, this.gridY);
        
        // Check if enemy is close enough to center to be considered at intersection
        const distanceToCenter = Math.sqrt(
            Math.pow(this.x - centerPos.x, 2) + Math.pow(this.y - centerPos.y, 2)
        );
        
        this.isAtIntersection = distanceToCenter <= this.intersectionThreshold;
    }
    
    /**
     * Handles wall collision by finding alternative direction
     */
    handleWallCollision() {
        // Try perpendicular directions
        const alternatives = [
            { x: -this.direction.y, y: this.direction.x }, // Turn left
            { x: this.direction.y, y: -this.direction.x }, // Turn right
            { x: -this.direction.x, y: -this.direction.y } // Turn around
        ];
        
        for (const alt of alternatives) {
            const testX = this.x + alt.x * this.speed;
            const testY = this.y + alt.y * this.speed;
            
            if (this.canMoveToPosition(testX, testY)) {
                this.direction = alt;
                break;
            }
        }
    }
    
    /**
     * Checks if enemy can move to a specific position (collision detection)
     * @param {number} x - Target x position
     * @param {number} y - Target y position
     * @returns {boolean} True if position is valid (no collision)
     */
    canMoveToPosition(x, y) {
        if (!this.mazeRenderer) return true;
        
        const halfSize = this.size / 2;
        
        // Check all four corners of the enemy bounding box
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
     * Handles enemy wrapping at maze edges
     */
    handleEdgeWrapping() {
        if (!this.mazeRenderer) return;
        
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Horizontal wrapping
        if (this.x < cellSize / 2) {
            const rightEdgeX = mazeDimensions.width - cellSize / 2;
            if (this.canMoveToPosition(rightEdgeX, this.y)) {
                this.x = rightEdgeX;
            }
        } else if (this.x > mazeDimensions.width - cellSize / 2) {
            const leftEdgeX = cellSize / 2;
            if (this.canMoveToPosition(leftEdgeX, this.y)) {
                this.x = leftEdgeX;
            }
        }
        
        // Vertical wrapping
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
    
    /**
     * Renders the enemy character
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {MazeRenderer} mazeRenderer - Maze renderer for coordinate conversion
     */
    render(ctx, mazeRenderer) {
        if (!mazeRenderer) return;
        
        // Convert world position to screen position
        const screenPos = mazeRenderer.worldToScreen(this.x, this.y);
        
        // Set enemy color (changes when vulnerable)
        ctx.fillStyle = this.color;
        
        // Draw enemy body (circle for now, can be enhanced later)
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.size / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add border for better visibility
        ctx.strokeStyle = this.isVulnerable ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.size / 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Add simple eyes for character
        this.renderEyes(ctx, screenPos);
        
        // Add vulnerability indicator
        if (this.isVulnerable && this.vulnerabilityTimer < 3000) {
            this.renderVulnerabilityIndicator(ctx, screenPos);
        }
    }
    
    /**
     * Renders enemy eyes
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} screenPos - Screen position {x, y}
     */
    renderEyes(ctx, screenPos) {
        const eyeSize = 2;
        const eyeOffset = 4;
        
        ctx.fillStyle = '#FFFFFF';
        
        // Left eye
        ctx.beginPath();
        ctx.arc(screenPos.x - eyeOffset, screenPos.y - 2, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(screenPos.x + eyeOffset, screenPos.y - 2, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        
        // Eye pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(screenPos.x - eyeOffset, screenPos.y - 2, eyeSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(screenPos.x + eyeOffset, screenPos.y - 2, eyeSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    /**
     * Renders vulnerability indicator when enemy is about to become invulnerable
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} screenPos - Screen position {x, y}
     */
    renderVulnerabilityIndicator(ctx, screenPos) {
        if (this.vulnerabilityTimer > 3000) {
            // Safe phase: steady blue glow
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.size / 2 + 4, 0, 2 * Math.PI);
            ctx.stroke();
            
        } else if (this.vulnerabilityTimer > 1000) {
            // Warning phase: pulsing yellow ring
            const pulseRate = 300;
            const shouldShow = Math.floor(this.vulnerabilityTimer / pulseRate) % 2 === 0;
            
            if (shouldShow) {
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, this.size / 2 + 5, 0, 2 * Math.PI);
                ctx.stroke();
            }
            
        } else {
            // Critical phase: rapid flashing red warning
            const rapidFlashRate = 100;
            const shouldFlash = Math.floor(this.vulnerabilityTimer / rapidFlashRate) % 2 === 0;
            
            if (shouldFlash) {
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, this.size / 2 + 6, 0, 2 * Math.PI);
                ctx.stroke();
                
                // Add inner warning ring
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, this.size / 2 + 2, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Sets enemy vulnerability state (from power pellet effects)
     * @param {boolean} vulnerable - Whether enemy should be vulnerable
     * @param {number} duration - Duration in milliseconds (optional)
     */
    setVulnerable(vulnerable, duration = this.vulnerabilityDuration) {
        const wasVulnerable = this.isVulnerable;
        this.isVulnerable = vulnerable;
        
        if (vulnerable) {
            this.vulnerabilityTimer = duration;
            this.state = 'vulnerable';
            
            // Only modify speed if not already vulnerable (avoid double modification)
            if (!wasVulnerable) {
                this.originalSpeed = this.speed; // Store original speed
                this.speed *= 0.5; // Slow down when vulnerable
            }
            
            // Clear current path to force recalculation with avoidance behavior
            this.path = [];
            this.pathIndex = 0;
            
        } else {
            this.vulnerabilityTimer = 0;
            this.state = 'chase';
            this.color = this.originalColor;
            
            // Restore original speed if we were vulnerable
            if (wasVulnerable && this.originalSpeed) {
                this.speed = this.originalSpeed;
            }
            
            // Clear avoidance path and force recalculation
            this.path = [];
            this.pathIndex = 0;
        }
    }
    
    /**
     * Gets current enemy position
     * @returns {Object} Position {x, y}
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    /**
     * Gets enemy size for collision detection
     * @returns {number} Enemy size in pixels
     */
    getSize() {
        return this.size;
    }
    
    /**
     * Gets enemy type
     * @returns {string} Enemy type
     */
    getType() {
        return this.type;
    }
    
    /**
     * Gets enemy state
     * @returns {string} Current enemy state
     */
    getState() {
        return this.state;
    }
    
    /**
     * Checks if enemy is vulnerable
     * @returns {boolean} True if enemy is vulnerable
     */
    getIsVulnerable() {
        return this.isVulnerable;
    }
    
    /**
     * Sets enemy position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateGridPosition();
    }
    
    /**
     * Sets enemy speed
     * @param {number} speed - New movement speed
     */
    setSpeed(speed) {
        this.speed = Math.max(0, speed);
    }
    
    /**
     * Resets enemy to initial state
     * @param {number} x - Starting x position
     * @param {number} y - Starting y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.direction = { x: 0, y: 0 };
        this.targetDirection = { x: 0, y: 0 };
        this.path = [];
        this.pathIndex = 0;
        this.lastPathUpdate = 0;
        this.setVulnerable(false);
        this.animationTime = 0;
        this.updateGridPosition();
    }
}