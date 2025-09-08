/**
 * Pellet class - Handles pellet placement, rendering, and types
 * Supports normal pellets and power pellets with different properties
 */
export class Pellet {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type; // 'normal' or 'power'
        this.collected = false;
        
        // Visual properties based on type
        if (type === 'power') {
            this.size = 8;
            this.color = '#ffff00'; // Yellow for power pellets
            this.points = 50;
            this.glowEffect = true;
        } else {
            this.size = 3;
            this.color = '#ffff00'; // Yellow for normal pellets
            this.points = 10;
            this.glowEffect = false;
        }
        
        // Animation properties
        this.animationTime = 0;
        this.pulseSpeed = 0.05;
    }
    
    /**
     * Updates pellet animation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.animationTime += deltaTime * this.pulseSpeed;
    }
    
    /**
     * Renders the pellet on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} screenPos - Screen position {x, y}
     */
    render(ctx, screenPos) {
        if (this.collected) return;
        
        ctx.save();
        
        // Apply glow effect for power pellets
        if (this.glowEffect) {
            const glowIntensity = 0.5 + 0.5 * Math.sin(this.animationTime);
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10 * glowIntensity;
        }
        
        // Render pellet as circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // Add pulsing effect for power pellets
        let renderSize = this.size;
        if (this.type === 'power') {
            renderSize = this.size * (0.8 + 0.2 * Math.sin(this.animationTime));
        }
        
        ctx.arc(screenPos.x, screenPos.y, renderSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add highlight for better visibility
        if (this.type === 'normal') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenPos.x - 1, screenPos.y - 1, renderSize / 4, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Checks if pellet collides with a circular object
     * @param {number} x - Object x position
     * @param {number} y - Object y position
     * @param {number} radius - Object radius
     * @returns {boolean} True if collision detected
     */
    checkCollision(x, y, radius) {
        if (this.collected) return false;
        
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.size / 2 + radius);
    }
    
    /**
     * Marks pellet as collected
     * @returns {number} Points awarded for collecting this pellet
     */
    collect() {
        if (this.collected) return 0;
        
        this.collected = true;
        return this.points;
    }
    
    /**
     * Gets pellet position
     * @returns {Object} Position {x, y}
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    /**
     * Gets pellet type
     * @returns {string} Pellet type
     */
    getType() {
        return this.type;
    }
    
    /**
     * Checks if pellet is collected
     * @returns {boolean} True if collected
     */
    isCollected() {
        return this.collected;
    }
    
    /**
     * Gets points value of pellet
     * @returns {number} Points value
     */
    getPoints() {
        return this.points;
    }
}

/**
 * PelletManager class - Manages all pellets in the game
 * Handles placement, rendering, and collection of pellets
 */
export class PelletManager {
    constructor(mazeGenerator, mazeRenderer) {
        this.mazeGenerator = mazeGenerator;
        this.mazeRenderer = mazeRenderer;
        this.pellets = [];
        this.totalPellets = 0;
        this.collectedPellets = 0;
        
        // Pellet placement configuration
        this.normalPelletDensity = 0.7; // Percentage of accessible cells with normal pellets
        this.powerPelletCount = 4; // Fixed number of power pellets per maze
    }
    
    /**
     * Generates and places pellets throughout the maze
     * @param {number[][]} maze - The maze grid
     */
    generatePellets(maze) {
        this.pellets = [];
        this.collectedPellets = 0;
        
        // Get all accessible positions from maze generator
        const accessiblePositions = this.mazeGenerator.getAccessiblePositions(maze);
        
        if (accessiblePositions.length === 0) {
            console.warn('No accessible positions found for pellet placement');
            return;
        }
        
        // Place normal pellets
        this.placeNormalPellets(accessiblePositions);
        
        // Place power pellets
        this.placePowerPellets(accessiblePositions);
        
        this.totalPellets = this.pellets.length;
        console.log(`Generated ${this.totalPellets} pellets (${this.pellets.filter(p => p.type === 'normal').length} normal, ${this.pellets.filter(p => p.type === 'power').length} power)`);
    }
    
    /**
     * Places normal pellets throughout accessible areas
     * @param {Array} accessiblePositions - Array of {x, y} positions
     */
    placeNormalPellets(accessiblePositions) {
        // Calculate how many normal pellets to place
        const normalPelletCount = Math.floor(accessiblePositions.length * this.normalPelletDensity);
        
        // Shuffle positions for random placement
        const shuffledPositions = this.shuffleArray([...accessiblePositions]);
        
        // Place normal pellets
        for (let i = 0; i < Math.min(normalPelletCount, shuffledPositions.length); i++) {
            const pos = shuffledPositions[i];
            const worldPos = this.mazeRenderer.gridToWorld(pos.x, pos.y);
            
            const pellet = new Pellet(worldPos.x, worldPos.y, 'normal');
            this.pellets.push(pellet);
        }
    }
    
    /**
     * Places power pellets in strategic locations
     * @param {Array} accessiblePositions - Array of {x, y} positions
     */
    placePowerPellets(accessiblePositions) {
        if (accessiblePositions.length < this.powerPelletCount) {
            console.warn('Not enough accessible positions for power pellets');
            return;
        }
        
        // Find corner positions or positions far from center for power pellets
        const cornerPositions = this.findCornerPositions(accessiblePositions);
        
        // If we don't have enough corner positions, use random positions
        const powerPelletPositions = cornerPositions.length >= this.powerPelletCount 
            ? cornerPositions.slice(0, this.powerPelletCount)
            : this.selectRandomPositions(accessiblePositions, this.powerPelletCount);
        
        // Place power pellets
        for (const pos of powerPelletPositions) {
            const worldPos = this.mazeRenderer.gridToWorld(pos.x, pos.y);
            
            // Ensure power pellet doesn't overlap with normal pellets
            this.removePelletAtPosition(worldPos.x, worldPos.y);
            
            const powerPellet = new Pellet(worldPos.x, worldPos.y, 'power');
            this.pellets.push(powerPellet);
        }
    }
    
    /**
     * Finds corner or edge positions for strategic power pellet placement
     * @param {Array} accessiblePositions - Array of {x, y} positions
     * @returns {Array} Array of corner positions
     */
    findCornerPositions(accessiblePositions) {
        const maze = this.mazeGenerator.getMaze ? this.mazeGenerator.getMaze() : null;
        if (!maze) return [];
        
        const mazeWidth = maze[0] ? maze[0].length : 0;
        const mazeHeight = maze.length;
        
        const cornerPositions = [];
        
        // Define corner regions (outer 25% of maze)
        const cornerThreshold = 0.25;
        const xThreshold = mazeWidth * cornerThreshold;
        const yThreshold = mazeHeight * cornerThreshold;
        
        for (const pos of accessiblePositions) {
            const isNearEdge = pos.x < xThreshold || pos.x > mazeWidth - xThreshold ||
                              pos.y < yThreshold || pos.y > mazeHeight - yThreshold;
            
            if (isNearEdge) {
                cornerPositions.push(pos);
            }
        }
        
        // Sort by distance from center to prioritize actual corners
        const centerX = mazeWidth / 2;
        const centerY = mazeHeight / 2;
        
        cornerPositions.sort((a, b) => {
            const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
            const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
            return distB - distA; // Sort by distance from center (descending)
        });
        
        return cornerPositions;
    }
    
    /**
     * Selects random positions from available positions
     * @param {Array} positions - Available positions
     * @param {number} count - Number of positions to select
     * @returns {Array} Selected positions
     */
    selectRandomPositions(positions, count) {
        const shuffled = this.shuffleArray([...positions]);
        return shuffled.slice(0, count);
    }
    
    /**
     * Removes any pellet at the specified world position
     * @param {number} worldX - World x coordinate
     * @param {number} worldY - World y coordinate
     */
    removePelletAtPosition(worldX, worldY) {
        this.pellets = this.pellets.filter(pellet => {
            const dx = pellet.x - worldX;
            const dy = pellet.y - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance > 10; // Remove if within 10 pixels
        });
    }
    
    /**
     * Updates all pellets
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        for (const pellet of this.pellets) {
            pellet.update(deltaTime);
        }
    }
    
    /**
     * Renders all pellets
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        for (const pellet of this.pellets) {
            if (!pellet.isCollected()) {
                const screenPos = this.mazeRenderer.worldToScreen(pellet.x, pellet.y);
                
                // Only render if pellet is visible on screen
                if (this.isOnScreen(screenPos)) {
                    pellet.render(ctx, screenPos);
                }
            }
        }
    }
    
    /**
     * Checks if a screen position is visible
     * @param {Object} screenPos - Screen position {x, y}
     * @returns {boolean} True if position is on screen
     */
    isOnScreen(screenPos) {
        const canvas = this.mazeRenderer.canvas;
        return screenPos.x >= -20 && screenPos.x <= canvas.width + 20 &&
               screenPos.y >= -20 && screenPos.y <= canvas.height + 20;
    }
    
    /**
     * Checks collision with all pellets and handles collection
     * @param {number} x - Object x position
     * @param {number} y - Object y position
     * @param {number} radius - Object radius
     * @returns {Array} Array of collected pellets
     */
    checkCollisions(x, y, radius) {
        const collectedPellets = [];
        
        for (const pellet of this.pellets) {
            if (pellet.checkCollision(x, y, radius)) {
                const points = pellet.collect();
                if (points > 0) {
                    collectedPellets.push(pellet);
                    this.collectedPellets++;
                }
            }
        }
        
        return collectedPellets;
    }
    
    /**
     * Gets all pellets of a specific type
     * @param {string} type - Pellet type ('normal' or 'power')
     * @returns {Array} Array of pellets of specified type
     */
    getPelletsByType(type) {
        return this.pellets.filter(pellet => pellet.type === type);
    }
    
    /**
     * Gets count of remaining (uncollected) pellets
     * @returns {number} Number of uncollected pellets
     */
    getRemainingPelletCount() {
        return this.pellets.filter(pellet => !pellet.isCollected()).length;
    }
    
    /**
     * Gets count of collected pellets
     * @returns {number} Number of collected pellets
     */
    getCollectedPelletCount() {
        return this.collectedPellets;
    }
    
    /**
     * Gets total pellet count
     * @returns {number} Total number of pellets
     */
    getTotalPelletCount() {
        return this.totalPellets;
    }
    
    /**
     * Checks if all pellets have been collected
     * @returns {boolean} True if all pellets collected
     */
    areAllPelletsCollected() {
        return this.getRemainingPelletCount() === 0;
    }
    
    /**
     * Shuffles array elements randomly (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * Clears all pellets
     */
    clear() {
        this.pellets = [];
        this.totalPellets = 0;
        this.collectedPellets = 0;
    }
}