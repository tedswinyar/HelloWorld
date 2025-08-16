/**
 * Tests to verify that player cannot stop midway between cells
 * Player should only stop at grid centers when hitting walls
 */

import { Player } from '../../client/src/components/Player.js';

// Mock MazeRenderer for testing
class NoMidwayStopMockMazeRenderer {
    constructor() {
        this.cellSize = 20;
        this.mazeWidth = 800;
        this.mazeHeight = 600;
        this.walls = new Set();
    }
    
    getCellSize() {
        return this.cellSize;
    }
    
    getMazeDimensions() {
        return {
            width: this.mazeWidth,
            height: this.mazeHeight
        };
    }
    
    isWallAtPosition(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return this.walls.has(`${gridX},${gridY}`);
    }
    
    worldToScreen(x, y) {
        return { x, y };
    }
    
    addWall(gridX, gridY) {
        this.walls.add(`${gridX},${gridY}`);
    }
    
    // Helper to check if position is at grid center
    isAtGridCenter(x, y) {
        const centerX = Math.round(x / this.cellSize) * this.cellSize + this.cellSize / 2;
        const centerY = Math.round(y / this.cellSize) * this.cellSize + this.cellSize / 2;
        
        return Math.abs(x - centerX) < 1 && Math.abs(y - centerY) < 1;
    }
}

describe('No Midway Stop Prevention', () => {
    let player;
    let mockMazeRenderer;
    
    beforeEach(() => {
        mockMazeRenderer = new NoMidwayStopMockMazeRenderer();
        // Start player at center of grid cell
        player = new Player(110, 110, mockMazeRenderer); // Center of cell (5,5)
    });
    
    describe('Wall Collision Snapping', () => {
        test('should snap to grid center when hitting wall', () => {
            // Position player at a known grid center
            player.setPosition(50, 50); // Center of cell (2,2) with cellSize=20
            
            // Add wall 1 cell to the right (at grid position 3,2)
            // Player at (50,50) is at grid (2,2), so wall at (3,2) should block movement
            mockMazeRenderer.addWall(3, 2);
            
            // Start moving right
            player.setDirection('right');
            
            // Verify player starts moving
            expect(player.getDirection()).toEqual({ x: 1, y: 0 });
            
            // Move until hitting wall or max iterations
            let moveCount = 0;
            while (moveCount < 50) {
                const wasMoving = player.getIsMoving();
                player.update(16);
                moveCount++;
                
                // If player stopped, break
                if (wasMoving && !player.getIsMoving()) {
                    break;
                }
            }
            
            // Player should be stopped
            expect(player.getIsMoving()).toBe(false);
            expect(player.getDirection()).toEqual({ x: 0, y: 0 });
            
            // Player should be at a grid center (not midway between cells)
            expect(mockMazeRenderer.isAtGridCenter(player.x, player.y)).toBe(true);
            
            // Should have moved from original position
            expect(player.x).toBeGreaterThan(50);
        });
        
        test('should snap to grid center when hitting wall while moving vertically', () => {
            // Add wall 2 cells up
            mockMazeRenderer.addWall(5, 3);
            
            // Start moving up
            player.setDirection('up');
            
            // Move until hitting wall
            for (let i = 0; i < 50; i++) {
                player.update(16);
                if (!player.getIsMoving()) {
                    break;
                }
            }
            
            // Player should be stopped at a grid center
            expect(mockMazeRenderer.isAtGridCenter(player.x, player.y)).toBe(true);
            expect(player.getIsMoving()).toBe(false);
        });
        
        test('should not stop midway when no walls are present', () => {
            // No walls - player should continue moving
            player.setDirection('right');
            
            // Move for many frames
            for (let i = 0; i < 100; i++) {
                player.update(16);
            }
            
            // Player should still be moving
            expect(player.getIsMoving()).toBe(true);
            expect(player.getDirection()).toEqual({ x: 1, y: 0 });
            
            // Should have moved significantly
            expect(player.x).toBeGreaterThan(200);
        });
        
        test('should snap to nearest grid center regardless of approach angle', () => {
            // Position player slightly off-center
            player.setPosition(115, 107); // Slightly off from grid center
            
            // Add wall directly ahead
            mockMazeRenderer.addWall(6, 5);
            
            player.setDirection('right');
            
            // Move until hitting wall
            for (let i = 0; i < 20; i++) {
                player.update(16);
                if (!player.getIsMoving()) {
                    break;
                }
            }
            
            // Should snap to proper grid center
            expect(mockMazeRenderer.isAtGridCenter(player.x, player.y)).toBe(true);
        });
    });
    
    describe('Continuous Movement Behavior', () => {
        test('should continue moving until hitting wall or changing direction', () => {
            player.setDirection('right');
            
            const initialX = player.x;
            let frameCount = 0;
            
            // Move for several frames
            while (frameCount < 20 && player.getIsMoving()) {
                player.update(16);
                frameCount++;
            }
            
            // Should have moved and still be moving (no walls)
            expect(player.x).toBeGreaterThan(initialX);
            expect(player.getIsMoving()).toBe(true);
        });
        
        test('should change direction smoothly without stopping midway', () => {
            // Start moving right
            player.setDirection('right');
            player.update(16);
            player.update(16);
            
            const positionBeforeChange = { x: player.x, y: player.y };
            
            // Change direction to up
            player.setDirection('up');
            
            // Should change direction without stopping at non-grid position
            expect(player.getDirection()).toEqual({ x: 0, y: -1 });
            
            // Continue moving
            player.update(16);
            player.update(16);
            
            // Should have moved from the change position
            expect(player.y).toBeLessThan(positionBeforeChange.y);
            expect(player.getIsMoving()).toBe(true);
        });
    });
    
    describe('Grid Center Validation', () => {
        test('should always stop at valid grid positions', () => {
            const testCases = [
                { direction: 'right', wallOffset: { x: 3, y: 0 } },
                { direction: 'left', wallOffset: { x: -3, y: 0 } },
                { direction: 'up', wallOffset: { x: 0, y: -3 } },
                { direction: 'down', wallOffset: { x: 0, y: 3 } }
            ];
            
            for (const testCase of testCases) {
                // Reset player position
                player.setPosition(110, 110);
                player.direction = { x: 0, y: 0 };
                player.isMoving = false;
                
                // Clear walls and add new wall
                mockMazeRenderer.walls.clear();
                const currentGridX = Math.floor(110 / mockMazeRenderer.cellSize);
                const currentGridY = Math.floor(110 / mockMazeRenderer.cellSize);
                mockMazeRenderer.addWall(
                    currentGridX + testCase.wallOffset.x, 
                    currentGridY + testCase.wallOffset.y
                );
                
                // Move in test direction
                player.setDirection(testCase.direction);
                
                // Move until stopped
                for (let i = 0; i < 50; i++) {
                    player.update(16);
                    if (!player.getIsMoving()) {
                        break;
                    }
                }
                
                // Should be at grid center
                expect(mockMazeRenderer.isAtGridCenter(player.x, player.y)).toBe(true);
            }
        });
        
        test('should maintain grid alignment after multiple direction changes', () => {
            const directions = ['right', 'down', 'left', 'up'];
            
            for (let i = 0; i < directions.length; i++) {
                player.setDirection(directions[i]);
                
                // Move a few steps
                for (let j = 0; j < 5; j++) {
                    player.update(16);
                }
                
                // Add wall to stop player
                const currentGridX = Math.floor(player.x / mockMazeRenderer.cellSize);
                const currentGridY = Math.floor(player.y / mockMazeRenderer.cellSize);
                
                // Add wall in current direction
                if (directions[i] === 'right') mockMazeRenderer.addWall(currentGridX + 1, currentGridY);
                else if (directions[i] === 'left') mockMazeRenderer.addWall(currentGridX - 1, currentGridY);
                else if (directions[i] === 'up') mockMazeRenderer.addWall(currentGridX, currentGridY - 1);
                else if (directions[i] === 'down') mockMazeRenderer.addWall(currentGridX, currentGridY + 1);
                
                // Move until stopped
                for (let k = 0; k < 20; k++) {
                    player.update(16);
                    if (!player.getIsMoving()) {
                        break;
                    }
                }
                
                // Should be at grid center
                expect(mockMazeRenderer.isAtGridCenter(player.x, player.y)).toBe(true);
                
                // Clear walls for next iteration
                mockMazeRenderer.walls.clear();
            }
        });
    });
});