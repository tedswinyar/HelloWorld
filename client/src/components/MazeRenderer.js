/**
 * MazeRenderer class - Handles rendering of maze on HTML5 Canvas
 * Implements viewport and camera system for maze display with visual styling
 */
export class MazeRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Rendering configuration
        this.cellSize = 20; // Size of each maze cell in pixels
        this.wallColor = '#0000FF'; // Blue walls
        this.pathColor = '#000000'; // Black paths
        this.wallThickness = 2;
        
        // Camera/viewport system
        this.camera = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height
        };
        
        // Maze dimensions
        this.mazeWidth = 0;
        this.mazeHeight = 0;
        this.maze = null;
    }
    
    /**
     * Sets the maze to be rendered
     * @param {number[][]} maze - 2D array representing the maze
     */
    setMaze(maze) {
        this.maze = maze;
        if (maze && maze.length > 0) {
            this.mazeHeight = maze.length;
            this.mazeWidth = maze[0] ? maze[0].length : 0;
        } else {
            this.mazeHeight = 0;
            this.mazeWidth = 0;
        }
    }
    
    /**
     * Renders the maze on the canvas
     */
    render() {
        // Always clear canvas first
        this.clearCanvas();
        
        // Only render maze if it exists
        if (!this.maze) return;
        
        // Calculate visible area based on camera position
        const visibleArea = this.calculateVisibleArea();
        
        // Render maze cells within visible area
        this.renderMazeCells(visibleArea);
        
        // Render maze borders
        this.renderMazeBorders();
    }
    
    /**
     * Clears the entire canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = this.pathColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Calculates which part of the maze is visible based on camera position
     * @returns {Object} Visible area bounds
     */
    calculateVisibleArea() {
        const startX = Math.max(0, Math.floor(this.camera.x / this.cellSize));
        const startY = Math.max(0, Math.floor(this.camera.y / this.cellSize));
        const endX = Math.min(this.mazeWidth, Math.ceil((this.camera.x + this.camera.width) / this.cellSize));
        const endY = Math.min(this.mazeHeight, Math.ceil((this.camera.y + this.camera.height) / this.cellSize));
        
        return { startX, startY, endX, endY };
    }
    
    /**
     * Renders maze cells within the visible area
     * @param {Object} visibleArea - The visible area bounds
     */
    renderMazeCells(visibleArea) {
        const { startX, startY, endX, endY } = visibleArea;
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.maze[y] && this.maze[y][x] === 1) { // Wall cell
                    this.renderWallCell(x, y);
                }
            }
        }
    }
    
    /**
     * Renders a single wall cell
     * @param {number} x - Grid x coordinate
     * @param {number} y - Grid y coordinate
     */
    renderWallCell(x, y) {
        const screenX = x * this.cellSize - this.camera.x;
        const screenY = y * this.cellSize - this.camera.y;
        
        // Fill the wall cell
        this.ctx.fillStyle = this.wallColor;
        this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
        
        // Add border for better visual definition
        this.ctx.strokeStyle = '#000080'; // Darker blue for borders
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(screenX, screenY, this.cellSize, this.cellSize);
    }
    
    /**
     * Renders maze borders for better visual definition
     */
    renderMazeBorders() {
        if (!this.maze) return;
        
        const mazePixelWidth = this.mazeWidth * this.cellSize;
        const mazePixelHeight = this.mazeHeight * this.cellSize;
        
        this.ctx.strokeStyle = this.wallColor;
        this.ctx.lineWidth = this.wallThickness;
        
        // Draw border around entire maze
        const borderX = -this.camera.x;
        const borderY = -this.camera.y;
        
        this.ctx.strokeRect(borderX, borderY, mazePixelWidth, mazePixelHeight);
    }
    
    /**
     * Updates camera position to follow a target (like player)
     * @param {number} targetX - Target x coordinate in world space
     * @param {number} targetY - Target y coordinate in world space
     */
    updateCamera(targetX, targetY) {
        // Center camera on target
        this.camera.x = targetX - this.camera.width / 2;
        this.camera.y = targetY - this.camera.height / 2;
        
        // Clamp camera to maze bounds (only if maze exists)
        if (this.maze && this.mazeWidth > 0 && this.mazeHeight > 0) {
            const mazePixelWidth = this.mazeWidth * this.cellSize;
            const mazePixelHeight = this.mazeHeight * this.cellSize;
            
            // Only clamp if maze is larger than viewport
            if (mazePixelWidth > this.camera.width) {
                this.camera.x = Math.max(0, Math.min(this.camera.x, mazePixelWidth - this.camera.width));
            } else {
                this.camera.x = 0;
            }
            
            if (mazePixelHeight > this.camera.height) {
                this.camera.y = Math.max(0, Math.min(this.camera.y, mazePixelHeight - this.camera.height));
            } else {
                this.camera.y = 0;
            }
        }
    }
    
    /**
     * Sets camera position directly
     * @param {number} x - Camera x position
     * @param {number} y - Camera y position
     */
    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    /**
     * Gets current camera position
     * @returns {Object} Camera position {x, y}
     */
    getCameraPosition() {
        return { x: this.camera.x, y: this.camera.y };
    }
    
    /**
     * Converts world coordinates to screen coordinates
     * @param {number} worldX - World x coordinate
     * @param {number} worldY - World y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.camera.x,
            y: worldY - this.camera.y
        };
    }
    
    /**
     * Converts screen coordinates to world coordinates
     * @param {number} screenX - Screen x coordinate
     * @param {number} screenY - Screen y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.camera.x,
            y: screenY + this.camera.y
        };
    }
    
    /**
     * Converts world coordinates to grid coordinates
     * @param {number} worldX - World x coordinate
     * @param {number} worldY - World y coordinate
     * @returns {Object} Grid coordinates {x, y}
     */
    worldToGrid(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.cellSize),
            y: Math.floor(worldY / this.cellSize)
        };
    }
    
    /**
     * Converts grid coordinates to world coordinates (center of cell)
     * @param {number} gridX - Grid x coordinate
     * @param {number} gridY - Grid y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.cellSize + this.cellSize / 2,
            y: gridY * this.cellSize + this.cellSize / 2
        };
    }
    
    /**
     * Checks if a world position is within a wall
     * @param {number} worldX - World x coordinate
     * @param {number} worldY - World y coordinate
     * @returns {boolean} True if position is in a wall
     */
    isWallAtPosition(worldX, worldY) {
        if (!this.maze) return false;
        
        const gridPos = this.worldToGrid(worldX, worldY);
        
        if (gridPos.x < 0 || gridPos.x >= this.mazeWidth || 
            gridPos.y < 0 || gridPos.y >= this.mazeHeight) {
            return true; // Out of bounds is considered a wall
        }
        
        return this.maze[gridPos.y][gridPos.x] === 1;
    }
    
    /**
     * Gets the maze cell size
     * @returns {number} Cell size in pixels
     */
    getCellSize() {
        return this.cellSize;
    }
    
    /**
     * Sets the maze cell size
     * @param {number} size - New cell size in pixels
     */
    setCellSize(size) {
        this.cellSize = Math.max(1, size); // Ensure positive size
    }
    
    /**
     * Gets maze dimensions in pixels
     * @returns {Object} Maze dimensions {width, height}
     */
    getMazeDimensions() {
        return {
            width: this.mazeWidth * this.cellSize,
            height: this.mazeHeight * this.cellSize
        };
    }
    
    /**
     * Sets rendering colors
     * @param {string} wallColor - Color for walls
     * @param {string} pathColor - Color for paths
     */
    setColors(wallColor, pathColor) {
        this.wallColor = wallColor;
        this.pathColor = pathColor;
    }
    
    /**
     * Renders debug information (grid lines, camera bounds, etc.)
     */
    renderDebugInfo() {
        if (!this.maze) return;
        
        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const visibleArea = this.calculateVisibleArea();
        
        // Vertical lines
        for (let x = visibleArea.startX; x <= visibleArea.endX; x++) {
            const screenX = x * this.cellSize - this.camera.x;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = visibleArea.startY; y <= visibleArea.endY; y++) {
            const screenY = y * this.cellSize - this.camera.y;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }
        
        // Draw camera bounds
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
    }
}