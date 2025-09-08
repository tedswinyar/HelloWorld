import { Enemy } from './Enemy.js';

/**
 * AIController class - Manages enemy AI behavior and pathfinding
 * Implements intelligent enemy spawning, behavior coordination, and difficulty scaling
 */
export class AIController {
    constructor(mazeRenderer) {
        this.enemies = [];
        this.mazeRenderer = mazeRenderer;
        
        // AI configuration
        this.maxEnemies = 4; // Maximum number of enemies
        this.spawnDelay = 2000; // Delay between enemy spawns (ms)
        this.lastSpawnTime = 0;
        this.enemiesSpawned = 0;
        
        // Enemy types and their spawn probabilities
        this.enemyTypes = [
            { type: 'chaser', probability: 0.3 },
            { type: 'ambusher', probability: 0.25 },
            { type: 'patrol', probability: 0.25 },
            { type: 'random', probability: 0.2 }
        ];
        
        // Difficulty scaling
        this.difficultyLevel = 1;
        this.baseEnemySpeed = 1.5;
        this.speedIncreasePerLevel = 0.1;
        
        // Spawn positions (will be calculated based on maze)
        this.spawnPositions = [];
        
        // AI state
        this.isActive = true;
        this.playerLastPosition = { x: 0, y: 0 };
        this.playerDirection = { x: 0, y: 0 };
        this.vulnerabilityEndTime = null;
    }
    
    /**
     * Updates all enemies and manages AI behavior
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} playerPosition - Player's current position {x, y}
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, playerPosition, gameState = {}) {
        if (!this.isActive) return;
        
        // Update player direction tracking
        this.updatePlayerTracking(playerPosition);
        
        // Spawn new enemies if needed
        this.updateEnemySpawning(deltaTime, gameState);
        
        // Update all existing enemies
        const enhancedGameState = {
            ...gameState,
            playerDirection: this.playerDirection,
            difficultyLevel: this.difficultyLevel
        };
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, playerPosition, enhancedGameState);
            
            // Remove enemies that are too far from playable area (cleanup)
            if (this.isEnemyOutOfBounds(enemy)) {
                this.enemies.splice(i, 1);
                console.log(`Removed out-of-bounds ${enemy.getType ? enemy.getType() : 'unknown'} enemy`);
            }
        }
    }
    
    /**
     * Updates player position tracking for AI behavior
     * @param {Object} playerPosition - Player's current position {x, y}
     */
    updatePlayerTracking(playerPosition) {
        // Calculate player direction based on position change
        this.playerDirection = {
            x: playerPosition.x - this.playerLastPosition.x,
            y: playerPosition.y - this.playerLastPosition.y
        };
        
        // Normalize direction
        const length = Math.sqrt(this.playerDirection.x ** 2 + this.playerDirection.y ** 2);
        if (length > 0) {
            this.playerDirection.x /= length;
            this.playerDirection.y /= length;
        }
        
        this.playerLastPosition = { ...playerPosition };
    }
    
    /**
     * Updates enemy spawning logic
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} gameState - Current game state
     */
    updateEnemySpawning(deltaTime, gameState) {
        this.lastSpawnTime += deltaTime;
        
        // Check if we should spawn a new enemy
        if (this.enemies.length < this.maxEnemies && 
            this.lastSpawnTime >= this.spawnDelay && 
            this.enemiesSpawned < this.maxEnemies) {
            
            this.spawnEnemy();
            this.lastSpawnTime = 0;
        }
    }
    
    /**
     * Spawns a new enemy at a valid spawn position
     */
    spawnEnemy() {
        if (!this.mazeRenderer) return;
        
        // Get spawn positions if not already calculated
        if (this.spawnPositions.length === 0) {
            this.calculateSpawnPositions();
        }
        
        if (this.spawnPositions.length === 0) {
            console.warn('No valid spawn positions found for enemies');
            return;
        }
        
        // Select spawn position
        const spawnPos = this.spawnPositions[this.enemiesSpawned % this.spawnPositions.length];
        
        // Select enemy type based on probability
        const enemyType = this.selectEnemyType();
        
        // Create new enemy
        const enemy = new Enemy(spawnPos.x, spawnPos.y, this.mazeRenderer, enemyType);
        
        // Apply difficulty scaling
        this.applyDifficultyScaling(enemy);
        
        this.enemies.push(enemy);
        this.enemiesSpawned++;
        
        console.log(`Spawned ${enemyType} enemy at position (${spawnPos.x}, ${spawnPos.y})`);
    }
    
    /**
     * Calculates valid spawn positions for enemies
     */
    calculateSpawnPositions() {
        if (!this.mazeRenderer) return;
        
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const cellSize = this.mazeRenderer.getCellSize();
        
        // Define potential spawn areas (corners and edges)
        const potentialSpawns = [
            // Corners
            { x: cellSize * 2, y: cellSize * 2 },
            { x: mazeDimensions.width - cellSize * 2, y: cellSize * 2 },
            { x: cellSize * 2, y: mazeDimensions.height - cellSize * 2 },
            { x: mazeDimensions.width - cellSize * 2, y: mazeDimensions.height - cellSize * 2 },
            
            // Mid-edges
            { x: mazeDimensions.width / 2, y: cellSize * 2 },
            { x: mazeDimensions.width / 2, y: mazeDimensions.height - cellSize * 2 },
            { x: cellSize * 2, y: mazeDimensions.height / 2 },
            { x: mazeDimensions.width - cellSize * 2, y: mazeDimensions.height / 2 }
        ];
        
        // Filter out positions that are walls
        this.spawnPositions = potentialSpawns.filter(pos => 
            !this.mazeRenderer.isWallAtPosition(pos.x, pos.y)
        );
        
        // If no valid spawn positions, use center areas
        if (this.spawnPositions.length === 0) {
            const centerX = mazeDimensions.width / 2;
            const centerY = mazeDimensions.height / 2;
            const radius = Math.min(mazeDimensions.width, mazeDimensions.height) / 4;
            
            for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 2) {
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (!this.mazeRenderer.isWallAtPosition(x, y)) {
                    this.spawnPositions.push({ x, y });
                }
            }
        }
        
        console.log(`Calculated ${this.spawnPositions.length} valid spawn positions`);
    }
    
    /**
     * Selects enemy type based on probability distribution
     * @returns {string} Selected enemy type
     */
    selectEnemyType() {
        const random = Math.random();
        let cumulativeProbability = 0;
        
        for (const enemyTypeInfo of this.enemyTypes) {
            cumulativeProbability += enemyTypeInfo.probability;
            if (random <= cumulativeProbability) {
                return enemyTypeInfo.type;
            }
        }
        
        // Fallback to first type
        return this.enemyTypes[0].type;
    }
    
    /**
     * Applies difficulty scaling to newly spawned enemy
     * @param {Enemy} enemy - Enemy to apply scaling to
     */
    applyDifficultyScaling(enemy) {
        const scaledSpeed = this.baseEnemySpeed + (this.difficultyLevel - 1) * this.speedIncreasePerLevel;
        enemy.setSpeed(scaledSpeed);
        
        // Adjust pathfinding frequency based on difficulty
        if (this.difficultyLevel > 3) {
            enemy.pathUpdateInterval = Math.max(200, enemy.pathUpdateInterval - 50);
        }
    }
    
    /**
     * Checks if enemy is out of bounds and should be removed
     * @param {Enemy} enemy - Enemy to check
     * @returns {boolean} True if enemy is out of bounds
     */
    isEnemyOutOfBounds(enemy) {
        if (!this.mazeRenderer) return false;
        
        const pos = enemy.getPosition();
        const mazeDimensions = this.mazeRenderer.getMazeDimensions();
        const buffer = 100; // Allow some buffer outside maze
        
        return pos.x < -buffer || 
               pos.x > mazeDimensions.width + buffer ||
               pos.y < -buffer || 
               pos.y > mazeDimensions.height + buffer;
    }
    
    /**
     * Renders all enemies
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        for (const enemy of this.enemies) {
            enemy.render(ctx, this.mazeRenderer);
        }
    }
    
    /**
     * Sets all enemies to vulnerable state (power pellet effect)
     * @param {boolean} vulnerable - Whether enemies should be vulnerable
     * @param {number} duration - Duration in milliseconds
     */
    setAllEnemiesVulnerable(vulnerable, duration = 10000) {
        let affectedCount = 0;
        
        for (const enemy of this.enemies) {
            // Only affect enemies that aren't already in the desired state
            if (enemy.getIsVulnerable() !== vulnerable) {
                enemy.setVulnerable(vulnerable, duration);
                affectedCount++;
            }
        }
        
        if (vulnerable) {
            console.log(`Made ${affectedCount} enemies vulnerable for ${duration / 1000} seconds`);
            
            // Store vulnerability end time for tracking
            this.vulnerabilityEndTime = Date.now() + duration;
        } else {
            console.log(`Restored ${affectedCount} enemies to normal state`);
            this.vulnerabilityEndTime = null;
        }
    }
    
    /**
     * Gets the number of vulnerable enemies
     * @returns {number} Count of vulnerable enemies
     */
    getVulnerableEnemyCount() {
        return this.enemies.filter(enemy => enemy.getIsVulnerable()).length;
    }
    
    /**
     * Gets remaining vulnerability time in milliseconds
     * @returns {number} Remaining time or 0 if not vulnerable
     */
    getRemainingVulnerabilityTime() {
        if (!this.vulnerabilityEndTime) return 0;
        return Math.max(0, this.vulnerabilityEndTime - Date.now());
    }
    
    /**
     * Checks if any enemies are currently vulnerable
     * @returns {boolean} True if any enemy is vulnerable
     */
    hasVulnerableEnemies() {
        return this.enemies.some(enemy => enemy.getIsVulnerable());
    }
    
    /**
     * Checks collision between player and enemies
     * @param {Object} playerPosition - Player position {x, y}
     * @param {number} playerSize - Player size for collision detection
     * @returns {Array} Array of enemies that collided with player
     */
    checkPlayerCollisions(playerPosition, playerSize) {
        const collisions = [];
        
        for (const enemy of this.enemies) {
            const enemyPos = enemy.getPosition();
            const enemySize = enemy.getSize();
            
            // Calculate distance between player and enemy
            const dx = playerPosition.x - enemyPos.x;
            const dy = playerPosition.y - enemyPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if collision occurred
            const collisionDistance = (playerSize + enemySize) / 2;
            if (distance < collisionDistance) {
                collisions.push(enemy);
            }
        }
        
        return collisions;
    }
    
    /**
     * Removes a specific enemy (e.g., when eaten during vulnerability)
     * @param {Enemy} enemyToRemove - Enemy to remove
     * @returns {boolean} True if enemy was found and removed
     */
    removeEnemy(enemyToRemove) {
        const index = this.enemies.indexOf(enemyToRemove);
        if (index !== -1) {
            this.enemies.splice(index, 1);
            console.log(`Removed ${enemyToRemove.getType()} enemy`);
            return true;
        }
        return false;
    }
    
    /**
     * Gets all current enemies
     * @returns {Array} Array of current enemies
     */
    getEnemies() {
        return [...this.enemies];
    }
    
    /**
     * Gets count of enemies by state
     * @returns {Object} Count of enemies by state
     */
    getEnemyStats() {
        const stats = {
            total: this.enemies.length,
            vulnerable: 0,
            chasing: 0,
            byType: {}
        };
        
        for (const enemy of this.enemies) {
            if (enemy.getIsVulnerable()) {
                stats.vulnerable++;
            } else {
                stats.chasing++;
            }
            
            const type = enemy.getType();
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Sets difficulty level for AI scaling
     * @param {number} level - Difficulty level (1+)
     */
    setDifficultyLevel(level) {
        this.difficultyLevel = Math.max(1, level);
        
        // Adjust max enemies based on difficulty
        this.maxEnemies = Math.min(6, 4 + Math.floor(level / 3));
        
        // Adjust spawn delay based on difficulty
        this.spawnDelay = Math.max(1000, 2000 - (level - 1) * 100);
        
        console.log(`AI difficulty set to level ${level}: ${this.maxEnemies} max enemies, ${this.spawnDelay}ms spawn delay`);
    }
    
    /**
     * Resets AI controller for new game/level
     */
    reset() {
        this.enemies = [];
        this.enemiesSpawned = 0;
        this.lastSpawnTime = 0;
        this.spawnPositions = [];
        this.playerLastPosition = { x: 0, y: 0 };
        this.playerDirection = { x: 0, y: 0 };
        
        console.log('AI Controller reset');
    }
    
    /**
     * Activates or deactivates AI system
     * @param {boolean} active - Whether AI should be active
     */
    setActive(active) {
        this.isActive = active;
        
        if (!active) {
            // Stop all enemy movement when inactive
            for (const enemy of this.enemies) {
                enemy.direction = { x: 0, y: 0 };
                enemy.targetDirection = { x: 0, y: 0 };
            }
        }
        
        console.log(`AI Controller ${active ? 'activated' : 'deactivated'}`);
    }
    
    /**
     * Updates maze renderer reference (for level changes)
     * @param {MazeRenderer} mazeRenderer - New maze renderer
     */
    setMazeRenderer(mazeRenderer) {
        this.mazeRenderer = mazeRenderer;
        
        // Update all existing enemies with new maze renderer
        for (const enemy of this.enemies) {
            enemy.mazeRenderer = mazeRenderer;
        }
        
        // Recalculate spawn positions for new maze
        this.spawnPositions = [];
        this.calculateSpawnPositions();
    }
}