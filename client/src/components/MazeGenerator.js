/**
 * MazeGenerator class - Generates random mazes using recursive backtracking algorithm
 * Ensures all areas are reachable and creates proper maze structure
 */
export class MazeGenerator {
    constructor(width, height) {
        // Ensure odd dimensions for proper maze structure
        this.width = width % 2 === 0 ? width + 1 : width;
        this.height = height % 2 === 0 ? height + 1 : height;
        
        // Maze cell types
        this.WALL = 1;
        this.PATH = 0;
        
        // Directions for maze generation (up, right, down, left)
        this.directions = [
            { x: 0, y: -2 }, // up
            { x: 2, y: 0 },  // right
            { x: 0, y: 2 },  // down
            { x: -2, y: 0 }  // left
        ];
    }
    
    /**
     * Generates a maze using recursive backtracking algorithm with Pac-Man style modifications
     * @returns {number[][]} 2D array representing the maze (0 = path, 1 = wall)
     */
    generate() {
        // Initialize maze filled with walls
        const maze = this.initializeMaze();
        
        // Start from position (1, 1) - first valid path cell
        const startX = 1;
        const startY = 1;
        
        // Mark starting position as path
        maze[startY][startX] = this.PATH;
        
        // Generate base maze using recursive backtracking
        this.recursiveBacktrack(maze, startX, startY);
        
        // Add Pac-Man style features: loops, wider corridors, and open areas
        this.addPacManFeatures(maze);
        
        // Ensure starting position has multiple path choices
        this.ensureStartingChoices(maze);
        
        // Ensure maze has proper structure and all areas are reachable
        this.validateMaze(maze);
        
        return maze;
    }
    
    /**
     * Initializes maze grid filled with walls
     * @returns {number[][]} 2D array filled with walls
     */
    initializeMaze() {
        const maze = [];
        for (let y = 0; y < this.height; y++) {
            maze[y] = [];
            for (let x = 0; x < this.width; x++) {
                maze[y][x] = this.WALL;
            }
        }
        return maze;
    }
    
    /**
     * Recursive backtracking algorithm for maze generation
     * @param {number[][]} maze - The maze grid
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     */
    recursiveBacktrack(maze, x, y) {
        // Get shuffled directions for randomness
        const shuffledDirections = this.shuffleArray([...this.directions]);
        
        for (const direction of shuffledDirections) {
            const newX = x + direction.x;
            const newY = y + direction.y;
            
            // Check if new position is valid and unvisited
            if (this.isValidPosition(newX, newY) && maze[newY][newX] === this.WALL) {
                // Create path to new position (remove wall between current and new position)
                const wallX = x + direction.x / 2;
                const wallY = y + direction.y / 2;
                
                maze[newY][newX] = this.PATH;
                maze[wallY][wallX] = this.PATH;
                
                // Recursively continue from new position
                this.recursiveBacktrack(maze, newX, newY);
            }
        }
    }
    
    /**
     * Checks if position is valid within maze bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if position is valid
     */
    isValidPosition(x, y) {
        return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
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
     * Validates maze structure and ensures all areas are reachable
     * @param {number[][]} maze - The maze to validate
     * @throws {Error} If maze validation fails
     */
    validateMaze(maze) {
        // Find all path cells
        const pathCells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (maze[y][x] === this.PATH) {
                    pathCells.push({ x, y });
                }
            }
        }
        
        if (pathCells.length === 0) {
            throw new Error('Maze generation failed: No path cells found');
        }
        
        // Check reachability using flood fill from first path cell
        const visited = new Set();
        const stack = [pathCells[0]];
        
        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check all four directions
            const neighbors = [
                { x: current.x, y: current.y - 1 }, // up
                { x: current.x + 1, y: current.y }, // right
                { x: current.x, y: current.y + 1 }, // down
                { x: current.x - 1, y: current.y }  // left
            ];
            
            for (const neighbor of neighbors) {
                if (this.isInBounds(neighbor.x, neighbor.y) && 
                    maze[neighbor.y][neighbor.x] === this.PATH &&
                    !visited.has(`${neighbor.x},${neighbor.y}`)) {
                    stack.push(neighbor);
                }
            }
        }
        
        // Verify all path cells are reachable
        if (visited.size !== pathCells.length) {
            throw new Error('Maze generation failed: Not all areas are reachable');
        }
    }
    
    /**
     * Checks if coordinates are within maze bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if coordinates are within bounds
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    /**
     * Adds Pac-Man style features to the maze: loops, connections, and open areas
     * @param {number[][]} maze - The maze grid to modify
     */
    addPacManFeatures(maze) {
        // Add random loops by removing walls between existing paths
        this.addRandomLoops(maze);
        
        // Create some wider corridors
        this.createWiderCorridors(maze);
        
        // Add some open areas
        this.createOpenAreas(maze);
        
        // Ensure horizontal tunnels at edges for wrapping
        this.createEdgeTunnels(maze);
    }
    
    /**
     * Adds random loops by connecting existing paths
     * @param {number[][]} maze - The maze grid
     */
    addRandomLoops(maze) {
        const loopCount = Math.floor((this.width * this.height) / 200); // Adjust density
        
        for (let i = 0; i < loopCount; i++) {
            // Find a random wall that could create a loop
            const x = 2 + Math.floor(Math.random() * (this.width - 4));
            const y = 2 + Math.floor(Math.random() * (this.height - 4));
            
            // Only modify walls, not existing paths
            if (maze[y][x] === this.WALL) {
                // Check if removing this wall would connect two different path areas
                const neighbors = this.getPathNeighbors(maze, x, y);
                if (neighbors.length >= 2) {
                    // Create the connection
                    maze[y][x] = this.PATH;
                }
            }
        }
    }
    
    /**
     * Creates wider corridors in some areas
     * @param {number[][} maze - The maze grid
     */
    createWiderCorridors(maze) {
        const corridorCount = Math.floor((this.width * this.height) / 300);
        
        for (let i = 0; i < corridorCount; i++) {
            const x = 2 + Math.floor(Math.random() * (this.width - 6));
            const y = 2 + Math.floor(Math.random() * (this.height - 6));
            
            // Create a 2x2 or 3x2 open area if there are paths nearby
            if (this.hasNearbyPaths(maze, x, y, 2)) {
                // Create horizontal corridor
                for (let dx = 0; dx < 3; dx++) {
                    for (let dy = 0; dy < 2; dy++) {
                        if (x + dx < this.width - 1 && y + dy < this.height - 1) {
                            maze[y + dy][x + dx] = this.PATH;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Creates small open areas (like Pac-Man's central area)
     * @param {number[][]} maze - The maze grid
     */
    createOpenAreas(maze) {
        const areaCount = Math.floor((this.width * this.height) / 400);
        
        for (let i = 0; i < areaCount; i++) {
            const centerX = 3 + Math.floor(Math.random() * (this.width - 8));
            const centerY = 3 + Math.floor(Math.random() * (this.height - 8));
            
            // Create a 3x3 or 4x4 open area
            const size = 3 + Math.floor(Math.random() * 2);
            
            if (this.hasNearbyPaths(maze, centerX, centerY, 3)) {
                for (let dx = -Math.floor(size/2); dx <= Math.floor(size/2); dx++) {
                    for (let dy = -Math.floor(size/2); dy <= Math.floor(size/2); dy++) {
                        const newX = centerX + dx;
                        const newY = centerY + dy;
                        
                        if (newX > 0 && newX < this.width - 1 && 
                            newY > 0 && newY < this.height - 1) {
                            maze[newY][newX] = this.PATH;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Creates horizontal tunnels at the edges for wrapping
     * @param {number[][]} maze - The maze grid
     */
    createEdgeTunnels(maze) {
        // Create horizontal tunnels in the middle area
        const midY = Math.floor(this.height / 2);
        
        // Ensure there are paths near the edges for wrapping
        if (midY > 1 && midY < this.height - 2) {
            // Left edge tunnel
            maze[midY][1] = this.PATH;
            maze[midY][2] = this.PATH;
            
            // Right edge tunnel  
            maze[midY][this.width - 2] = this.PATH;
            maze[midY][this.width - 3] = this.PATH;
        }
    }
    
    /**
     * Gets path neighbors of a given position
     * @param {number[][]} maze - The maze grid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array} Array of neighboring path positions
     */
    getPathNeighbors(maze, x, y) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // up
            { x: 1, y: 0 },  // right
            { x: 0, y: 1 },  // down
            { x: -1, y: 0 }  // left
        ];
        
        for (const dir of directions) {
            const newX = x + dir.x;
            const newY = y + dir.y;
            
            if (this.isInBounds(newX, newY) && maze[newY][newX] === this.PATH) {
                neighbors.push({ x: newX, y: newY });
            }
        }
        
        return neighbors;
    }
    
    /**
     * Checks if there are paths nearby within a given radius
     * @param {number[][]} maze - The maze grid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Search radius
     * @returns {boolean} True if paths are found nearby
     */
    hasNearbyPaths(maze, x, y, radius) {
        let pathCount = 0;
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const newX = x + dx;
                const newY = y + dy;
                
                if (this.isInBounds(newX, newY) && maze[newY][newX] === this.PATH) {
                    pathCount++;
                    if (pathCount >= 2) return true; // Found enough nearby paths
                }
            }
        }
        
        return pathCount >= 1;
    }
    
    /**
     * Ensures the starting position has at least two path choices
     * @param {number[][]} maze - The maze grid
     */
    ensureStartingChoices(maze) {
        // Find the actual starting position (first accessible position)
        const accessiblePositions = this.getAccessiblePositions(maze);
        if (accessiblePositions.length === 0) return;
        
        const startPos = accessiblePositions[0];
        const startX = startPos.x;
        const startY = startPos.y;
        
        // Count current path neighbors
        const currentNeighbors = this.getPathNeighbors(maze, startX, startY);
        
        // If starting position has less than 2 neighbors, create more paths
        if (currentNeighbors.length < 2) {
            this.createStartingPaths(maze, startX, startY);
        }
        
        // Also ensure there's a good starting area with multiple directions
        this.createStartingArea(maze, startX, startY);
    }
    
    /**
     * Creates additional paths from the starting position
     * @param {number[][]} maze - The maze grid
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     */
    createStartingPaths(maze, startX, startY) {
        const directions = [
            { x: 0, y: -1, name: 'up' },    // up
            { x: 1, y: 0, name: 'right' },  // right
            { x: 0, y: 1, name: 'down' },   // down
            { x: -1, y: 0, name: 'left' }   // left
        ];
        
        let pathsCreated = 0;
        const targetPaths = 2; // Ensure at least 2 paths from start
        
        // Shuffle directions for randomness
        const shuffledDirections = this.shuffleArray([...directions]);
        
        for (const direction of shuffledDirections) {
            if (pathsCreated >= targetPaths) break;
            
            const pathX = startX + direction.x;
            const pathY = startY + direction.y;
            
            // Check if we can create a path in this direction
            if (this.isInBounds(pathX, pathY) && maze[pathY][pathX] === this.WALL) {
                // Create a short corridor in this direction
                this.createCorridor(maze, startX, startY, direction, 3);
                pathsCreated++;
            }
        }
    }
    
    /**
     * Creates a corridor from a starting position in a given direction
     * @param {number[][]} maze - The maze grid
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {Object} direction - Direction object {x, y}
     * @param {number} length - Length of corridor to create
     */
    createCorridor(maze, startX, startY, direction, length) {
        for (let i = 1; i <= length; i++) {
            const newX = startX + (direction.x * i);
            const newY = startY + (direction.y * i);
            
            // Ensure we don't modify border walls
            if (newX > 0 && newX < this.width - 1 && 
                newY > 0 && newY < this.height - 1) {
                maze[newY][newX] = this.PATH;
                
                // Try to connect to existing paths
                if (i === length) {
                    this.tryConnectToExistingPaths(maze, newX, newY);
                }
            } else {
                break;
            }
        }
    }
    
    /**
     * Creates a more open starting area with multiple path options
     * @param {number[][]} maze - The maze grid
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     */
    createStartingArea(maze, startX, startY) {
        // Create a small open area around the starting position (avoid borders)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const newX = startX + dx;
                const newY = startY + dy;
                
                // Ensure we don't modify border walls
                if (newX > 1 && newX < this.width - 2 && 
                    newY > 1 && newY < this.height - 2) {
                    maze[newY][newX] = this.PATH;
                }
            }
        }
        
        // Create paths extending from the starting area (avoid borders)
        const directions = [
            { x: -2, y: 0 },  // left
            { x: 2, y: 0 },   // right
            { x: 0, y: -2 },  // up
            { x: 0, y: 2 }    // down
        ];
        
        for (const dir of directions) {
            const pathX = startX + dir.x;
            const pathY = startY + dir.y;
            
            // Ensure we don't create paths at borders
            if (pathX > 1 && pathX < this.width - 2 && 
                pathY > 1 && pathY < this.height - 2) {
                // Create path and intermediate connection
                maze[pathY][pathX] = this.PATH;
                maze[startY + dir.y / 2][startX + dir.x / 2] = this.PATH;
                
                // Extend the path a bit further (but stay away from borders)
                this.createCorridor(maze, pathX, pathY, dir, 2);
            }
        }
    }
    
    /**
     * Tries to connect a position to existing paths nearby
     * @param {number[][]} maze - The maze grid
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    tryConnectToExistingPaths(maze, x, y) {
        const searchRadius = 3;
        
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (this.isInBounds(checkX, checkY) && maze[checkY][checkX] === this.PATH) {
                    // Found an existing path, try to connect
                    const midX = x + Math.floor(dx / 2);
                    const midY = y + Math.floor(dy / 2);
                    
                    if (this.isInBounds(midX, midY)) {
                        maze[midY][midX] = this.PATH;
                        return; // Only create one connection
                    }
                }
            }
        }
    }
    
    /**
     * Gets accessible positions for pellet placement
     * @param {number[][]} maze - The maze grid
     * @returns {Array} Array of {x, y} positions where pellets can be placed
     */
    getAccessiblePositions(maze) {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (maze[y][x] === this.PATH) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }
}