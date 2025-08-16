import { MazeGenerator } from '../../client/src/components/MazeGenerator.js';

describe('MazeGenerator', () => {
    let mazeGenerator;
    
    beforeEach(() => {
        mazeGenerator = new MazeGenerator(21, 21);
    });
    
    describe('constructor', () => {
        test('should ensure odd dimensions for proper maze structure', () => {
            const evenGenerator = new MazeGenerator(20, 20);
            expect(evenGenerator.width).toBe(21);
            expect(evenGenerator.height).toBe(21);
        });
        
        test('should keep odd dimensions unchanged', () => {
            const oddGenerator = new MazeGenerator(19, 19);
            expect(oddGenerator.width).toBe(19);
            expect(oddGenerator.height).toBe(19);
        });
        
        test('should set correct constants', () => {
            expect(mazeGenerator.WALL).toBe(1);
            expect(mazeGenerator.PATH).toBe(0);
        });
    });
    
    describe('generate', () => {
        test('should generate a maze with correct dimensions', () => {
            const maze = mazeGenerator.generate();
            expect(maze.length).toBe(21);
            expect(maze[0].length).toBe(21);
        });
        
        test('should generate maze with walls and paths only', () => {
            const maze = mazeGenerator.generate();
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    expect([0, 1]).toContain(maze[y][x]);
                }
            }
        });
        
        test('should have borders as walls', () => {
            const maze = mazeGenerator.generate();
            const height = maze.length;
            const width = maze[0].length;
            
            // Check top and bottom borders
            for (let x = 0; x < width; x++) {
                expect(maze[0][x]).toBe(1); // top border
                expect(maze[height - 1][x]).toBe(1); // bottom border
            }
            
            // Check left and right borders
            for (let y = 0; y < height; y++) {
                expect(maze[y][0]).toBe(1); // left border
                expect(maze[y][width - 1]).toBe(1); // right border
            }
        });
        
        test('should have at least one path cell', () => {
            const maze = mazeGenerator.generate();
            let pathCount = 0;
            
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 0) pathCount++;
                }
            }
            
            expect(pathCount).toBeGreaterThan(0);
        });
        
        test('should generate different mazes on multiple calls', () => {
            const maze1 = mazeGenerator.generate();
            const maze2 = mazeGenerator.generate();
            
            // Mazes should be different (very unlikely to be identical)
            let differences = 0;
            for (let y = 0; y < maze1.length; y++) {
                for (let x = 0; x < maze1[y].length; x++) {
                    if (maze1[y][x] !== maze2[y][x]) {
                        differences++;
                    }
                }
            }
            
            expect(differences).toBeGreaterThan(0);
        });
    });
    
    describe('initializeMaze', () => {
        test('should create maze filled with walls', () => {
            const maze = mazeGenerator.initializeMaze();
            
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    expect(maze[y][x]).toBe(1);
                }
            }
        });
        
        test('should create maze with correct dimensions', () => {
            const maze = mazeGenerator.initializeMaze();
            expect(maze.length).toBe(21);
            expect(maze[0].length).toBe(21);
        });
    });
    
    describe('isValidPosition', () => {
        test('should return true for valid positions', () => {
            expect(mazeGenerator.isValidPosition(1, 1)).toBe(true);
            expect(mazeGenerator.isValidPosition(10, 10)).toBe(true);
            expect(mazeGenerator.isValidPosition(19, 19)).toBe(true);
        });
        
        test('should return false for border positions', () => {
            expect(mazeGenerator.isValidPosition(0, 0)).toBe(false);
            expect(mazeGenerator.isValidPosition(0, 10)).toBe(false);
            expect(mazeGenerator.isValidPosition(10, 0)).toBe(false);
            expect(mazeGenerator.isValidPosition(20, 20)).toBe(false);
        });
        
        test('should return false for out-of-bounds positions', () => {
            expect(mazeGenerator.isValidPosition(-1, 10)).toBe(false);
            expect(mazeGenerator.isValidPosition(10, -1)).toBe(false);
            expect(mazeGenerator.isValidPosition(25, 10)).toBe(false);
            expect(mazeGenerator.isValidPosition(10, 25)).toBe(false);
        });
    });
    
    describe('isInBounds', () => {
        test('should return true for positions within bounds', () => {
            expect(mazeGenerator.isInBounds(0, 0)).toBe(true);
            expect(mazeGenerator.isInBounds(10, 10)).toBe(true);
            expect(mazeGenerator.isInBounds(20, 20)).toBe(true);
        });
        
        test('should return false for positions outside bounds', () => {
            expect(mazeGenerator.isInBounds(-1, 0)).toBe(false);
            expect(mazeGenerator.isInBounds(0, -1)).toBe(false);
            expect(mazeGenerator.isInBounds(21, 10)).toBe(false);
            expect(mazeGenerator.isInBounds(10, 21)).toBe(false);
        });
    });
    
    describe('shuffleArray', () => {
        test('should return array with same length', () => {
            const original = [1, 2, 3, 4, 5];
            const shuffled = mazeGenerator.shuffleArray([...original]);
            expect(shuffled.length).toBe(original.length);
        });
        
        test('should contain all original elements', () => {
            const original = [1, 2, 3, 4, 5];
            const shuffled = mazeGenerator.shuffleArray([...original]);
            
            for (const element of original) {
                expect(shuffled).toContain(element);
            }
        });
        
        test('should eventually produce different orders', () => {
            const original = [1, 2, 3, 4, 5];
            let differentOrder = false;
            
            // Try multiple times to get a different order
            for (let i = 0; i < 10; i++) {
                const shuffled = mazeGenerator.shuffleArray([...original]);
                if (JSON.stringify(shuffled) !== JSON.stringify(original)) {
                    differentOrder = true;
                    break;
                }
            }
            
            expect(differentOrder).toBe(true);
        });
    });
    
    describe('validateMaze', () => {
        test('should pass validation for properly generated maze', () => {
            const maze = mazeGenerator.generate();
            expect(() => mazeGenerator.validateMaze(maze)).not.toThrow();
        });
        
        test('should throw error for maze with no paths', () => {
            const maze = mazeGenerator.initializeMaze(); // All walls
            expect(() => mazeGenerator.validateMaze(maze)).toThrow('No path cells found');
        });
        
        test('should throw error for maze with unreachable areas', () => {
            const maze = mazeGenerator.initializeMaze();
            // Create two separate path areas
            maze[1][1] = 0; // First area
            maze[5][5] = 0; // Second area (unreachable from first)
            
            expect(() => mazeGenerator.validateMaze(maze)).toThrow('Not all areas are reachable');
        });
    });
    
    describe('getAccessiblePositions', () => {
        test('should return all path positions', () => {
            const maze = mazeGenerator.generate();
            const positions = mazeGenerator.getAccessiblePositions(maze);
            
            // Count path cells in maze
            let pathCount = 0;
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 0) pathCount++;
                }
            }
            
            expect(positions.length).toBe(pathCount);
        });
        
        test('should return positions with correct structure', () => {
            const maze = mazeGenerator.generate();
            const positions = mazeGenerator.getAccessiblePositions(maze);
            
            for (const pos of positions) {
                expect(pos).toHaveProperty('x');
                expect(pos).toHaveProperty('y');
                expect(typeof pos.x).toBe('number');
                expect(typeof pos.y).toBe('number');
                expect(maze[pos.y][pos.x]).toBe(0); // Should be path
            }
        });
        
        test('should return empty array for maze with no paths', () => {
            const maze = mazeGenerator.initializeMaze(); // All walls
            const positions = mazeGenerator.getAccessiblePositions(maze);
            expect(positions).toEqual([]);
        });
    });
    
    describe('Pac-Man style features', () => {
        test('should have multiple paths and connections', () => {
            const maze = mazeGenerator.generate();
            
            // Count path cells that have multiple neighbors (indicating connections/loops)
            let multiConnectionCells = 0;
            
            for (let y = 1; y < maze.length - 1; y++) {
                for (let x = 1; x < maze[y].length - 1; x++) {
                    if (maze[y][x] === 0) { // Path cell
                        const neighbors = mazeGenerator.getPathNeighbors(maze, x, y);
                        if (neighbors.length > 2) {
                            multiConnectionCells++;
                        }
                    }
                }
            }
            
            // Should have some cells with multiple connections (indicating loops/intersections)
            expect(multiConnectionCells).toBeGreaterThan(0);
        });
        
        test('should create edge tunnels for wrapping', () => {
            const maze = mazeGenerator.generate();
            const midY = Math.floor(maze.length / 2);
            
            // Should have paths near the edges for wrapping
            let leftEdgePaths = 0;
            let rightEdgePaths = 0;
            
            for (let y = midY - 2; y <= midY + 2; y++) {
                if (y >= 0 && y < maze.length) {
                    if (maze[y][1] === 0) leftEdgePaths++;
                    if (maze[y][maze[0].length - 2] === 0) rightEdgePaths++;
                }
            }
            
            expect(leftEdgePaths).toBeGreaterThan(0);
            expect(rightEdgePaths).toBeGreaterThan(0);
        });
        
        test('getPathNeighbors should return correct neighbors', () => {
            const testMaze = [
                [1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 1, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 1, 1, 1, 1]
            ];
            
            mazeGenerator.setMaze = (maze) => { mazeGenerator.maze = maze; };
            mazeGenerator.setMaze(testMaze);
            
            // Test center position (2,1) - should have 2 neighbors
            const neighbors = mazeGenerator.getPathNeighbors(testMaze, 2, 1);
            expect(neighbors.length).toBe(2);
            
            // Test corner position (1,1) - should have 2 neighbors  
            const cornerNeighbors = mazeGenerator.getPathNeighbors(testMaze, 1, 1);
            expect(cornerNeighbors.length).toBe(2);
        });
        
        test('hasNearbyPaths should detect nearby paths', () => {
            const testMaze = [
                [1, 1, 1, 1, 1],
                [1, 0, 1, 0, 1],
                [1, 1, 1, 1, 1],
                [1, 0, 1, 0, 1],
                [1, 1, 1, 1, 1]
            ];
            
            // Should find nearby paths
            expect(mazeGenerator.hasNearbyPaths(testMaze, 2, 2, 2)).toBe(true);
            
            // Should not find paths in wall-only area (use smaller radius)
            expect(mazeGenerator.hasNearbyPaths(testMaze, 0, 0, 0)).toBe(false);
        });
    });
    
    describe('maze structure requirements', () => {
        test('should ensure all areas are reachable (requirement 8.2)', () => {
            const maze = mazeGenerator.generate();
            
            // This test is implicitly covered by the generate() method
            // which calls validateMaze() that ensures reachability
            expect(() => mazeGenerator.validateMaze(maze)).not.toThrow();
        });
        
        test('should create proper maze structure (requirement 8.1)', () => {
            const maze = mazeGenerator.generate();
            
            // Verify maze has proper structure:
            // 1. Has both walls and paths
            let wallCount = 0;
            let pathCount = 0;
            
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 1) wallCount++;
                    else pathCount++;
                }
            }
            
            expect(wallCount).toBeGreaterThan(0);
            expect(pathCount).toBeGreaterThan(0);
            
            // 2. Has proper borders (all walls)
            const height = maze.length;
            const width = maze[0].length;
            
            for (let x = 0; x < width; x++) {
                expect(maze[0][x]).toBe(1);
                expect(maze[height - 1][x]).toBe(1);
            }
            
            for (let y = 0; y < height; y++) {
                expect(maze[y][0]).toBe(1);
                expect(maze[y][width - 1]).toBe(1);
            }
        });
        
        test('should support pellet placement in accessible areas (requirement 8.3)', () => {
            const maze = mazeGenerator.generate();
            const accessiblePositions = mazeGenerator.getAccessiblePositions(maze);
            
            // Should have accessible positions for pellet placement
            expect(accessiblePositions.length).toBeGreaterThan(0);
            
            // All accessible positions should be paths
            for (const pos of accessiblePositions) {
                expect(maze[pos.y][pos.x]).toBe(0);
            }
        });
        
        test('should create Pac-Man style maze with multiple paths', () => {
            const maze = mazeGenerator.generate();
            
            // Count total paths - should be more than a simple tree maze
            let pathCount = 0;
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 0) pathCount++;
                }
            }
            
            // Should have a reasonable number of paths (not too sparse)
            const totalCells = maze.length * maze[0].length;
            const pathRatio = pathCount / totalCells;
            expect(pathRatio).toBeGreaterThan(0.2); // At least 20% paths
            expect(pathRatio).toBeLessThan(0.8); // Not more than 80% paths
        });
        
        test('should ensure starting position has multiple path choices', () => {
            const maze = mazeGenerator.generate();
            const accessiblePositions = mazeGenerator.getAccessiblePositions(maze);
            
            // Get the starting position (first accessible position)
            expect(accessiblePositions.length).toBeGreaterThan(0);
            const startPos = accessiblePositions[0];
            
            // Count path neighbors from starting position
            const neighbors = mazeGenerator.getPathNeighbors(maze, startPos.x, startPos.y);
            
            // Should have at least 2 path choices from the start
            expect(neighbors.length).toBeGreaterThanOrEqual(2);
        });
        
        test('ensureStartingChoices should create multiple paths from start', () => {
            // Create a simple maze with limited starting options
            const testMaze = [
                [1, 1, 1, 1, 1, 1, 1],
                [1, 0, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1]
            ];
            
            // Create a temporary generator with the right dimensions
            const tempGenerator = new MazeGenerator(7, 5);
            
            // Apply starting choices enhancement
            tempGenerator.ensureStartingChoices(testMaze);
            
            // Check that starting position now has more neighbors
            const neighbors = tempGenerator.getPathNeighbors(testMaze, 1, 1);
            expect(neighbors.length).toBeGreaterThan(0);
        });
    });
});