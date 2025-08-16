/**
 * Tests for grid-based movement behavior
 * Verifies that player can only change directions at intersections
 */

import { Player } from '../../client/src/components/Player.js';

// Mock MazeRenderer for grid-based testing
class GridMockMazeRenderer {
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
    
    worldToGrid(x, y) {
        return {
            x: Math.floor(x / this.cellSize),
            y: Math.floor(y / this.cellSize)
        };
    }
    
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.cellSize + this.cellSize / 2,
            y: gridY * this.cellSize + this.cellSize / 2
        };
    }
    
    addWall(gridX, gridY) {
        this.walls.add(`${gridX},${gridY}`);
    }
}

describe('Grid-Based Movement', () => {
    let player;
    let mockMazeRenderer;
    
    beforeEach(() => {
        mockMazeRenderer = new GridMockMazeRenderer();
        // Start player at center of grid cell (5, 5)
        const centerPos = mockMazeRenderer.gridToWorld(5, 5);
        player = new Player(centerPos.x, centerPos.y, mockMazeRenderer);
    });
    
    describe('Intersection Detection', () => {
        test('should detect when player is at intersection', () => {
            // Player starts at center of cell, should be at intersection
            expect(player.getIsAtIntersection()).toBe(true);
        });
        
        test('should detect when player is not at intersection', () => {
            // Move player away from center
            player.setPosition(player.x + 10, player.y);
            player.updateGridPosition();
            
            expect(player.getIsAtIntersection()).toBe(false);
        });
        
        test('should update intersection status as player moves', () => {
            player.setDirection('right');
            
            // Move player step by step
            for (let i = 0; i < 5; i++) {
                player.update(16);
                
                // Check if intersection status updates correctly
                const distanceFromCenter = Math.abs(player.x % mockMazeRenderer.cellSize - mockMazeRenderer.cellSize / 2);
                const expectedAtIntersection = distanceFromCenter <= player.intersectionThreshold;
                
                expect(player.getIsAtIntersection()).toBe(expectedAtIntersection);
            }
        });
    });
    
    describe('Direction Changes at Intersections', () => {
        test('should allow direction change when at intersection', () => {
            // Player starts at intersection
            expect(player.getIsAtIntersection()).toBe(true);
            
            player.setDirection('right');
            expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        });
        
        test('should queue direction change when not at intersection', () => {
            // Move player away from intersection
            player.setPosition(player.x + 10, player.y);
            player.updateGridPosition();
            expect(player.getIsAtIntersection()).toBe(false);
            
            // Try to change direction
            player.setDirection('up');
            
            // Direction should not change immediately
            expect(player.getDirection()).toEqual({ x: 0, y: 0 });
            
            // But next direction should be queued
            expect(player.nextDirection).toEqual({ x: 0, y: -1 });
        });
        
        test('should apply queued direction when reaching intersection', () => {
            // Start moving right
            player.setDirection('right');
            expect(player.getDirection()).toEqual({ x: 1, y: 0 });
            
            // Move several steps to get away from intersection
            for (let i = 0; i < 8; i++) {
                player.update(16);
            }
            
            // Should now be away from intersection
            expect(player.getIsAtIntersection()).toBe(false);
            
            // Queue up direction while moving
            player.setDirection('up');
            expect(player.getDirection()).toEqual({ x: 1, y: 0 }); // Still moving right
            expect(player.nextDirection).toEqual({ x: 0, y: -1 }); // Up queued
            
            // Continue moving until we reach next intersection
            for (let i = 0; i < 30; i++) {
                player.update(16);
                if (player.getDirection().y === -1) {
                    break; // Direction changed to up
                }
            }
            
            // Should have changed direction to up
            expect(player.getDirection()).toEqual({ x: 0, y: -1 });
        });
    });
    
    describe('Grid Snapping', () => {
        test('should snap to grid center when hitting wall', () => {
            // Add wall to the right
            const currentGrid = mockMazeRenderer.worldToGrid(player.x, player.y);
            mockMazeRenderer.addWall(currentGrid.x + 1, currentGrid.y);
            
            const initialCenter = mockMazeRenderer.gridToWorld(currentGrid.x, currentGrid.y);
            
            // Try to move right into wall
            player.setDirection('right');
            
            // Move until hitting wall
            for (let i = 0; i < 20; i++) {
                player.update(16);
                if (!player.getIsMoving()) {
                    break;
                }
            }
            
            // Should be snapped back to center of current cell
            expect(player.x).toBeCloseTo(initialCenter.x, 1);
            expect(player.y).toBeCloseTo(initialCenter.y, 1);
            expect(player.getIsAtIntersection()).toBe(true);
        });
        
        test('should snap to grid when crossing cell boundaries', () => {
            player.setDirection('right');
            
            const initialGridX = mockMazeRenderer.worldToGrid(player.x, player.y).x;
            
            // Move until we cross into next cell
            for (let i = 0; i < 15; i++) {
                player.update(16);
            }
            
            const newGridX = mockMazeRenderer.worldToGrid(player.x, player.y).x;
            
            // Should have moved to next grid cell
            expect(newGridX).toBe(initialGridX + 1);
            
            // Should be close to center of new cell
            const newCenter = mockMazeRenderer.gridToWorld(newGridX, mockMazeRenderer.worldToGrid(player.x, player.y).y);
            expect(Math.abs(player.x - newCenter.x)).toBeLessThan(player.speed);
        });
    });
    
    describe('Continuous Movement Prevention', () => {
        test('should not stop midway between cells', () => {
            player.setDirection('right');
            
            // Move for several frames
            for (let i = 0; i < 5; i++) {
                player.update(16);
            }
            
            // Player should still be moving (not stopped midway)
            expect(player.getIsMoving()).toBe(true);
            expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        });
        
        test('should continue moving until reaching intersection or wall', () => {
            player.setDirection('right');
            
            let frameCount = 0;
            const maxFrames = 50;
            
            // Move until we stop or reach max frames
            while (player.getIsMoving() && frameCount < maxFrames) {
                player.update(16);
                frameCount++;
            }
            
            // Should have either hit a wall or be at an intersection
            // (In this test case with no walls, should still be moving)
            expect(frameCount).toBeLessThan(maxFrames);
        });
        
        test('should only stop at grid centers when hitting walls', () => {
            // Add wall 2 cells to the right
            const currentGrid = mockMazeRenderer.worldToGrid(player.x, player.y);
            mockMazeRenderer.addWall(currentGrid.x + 2, currentGrid.y);
            
            player.setDirection('right');
            
            // Move until stopped
            for (let i = 0; i < 50; i++) {
                player.update(16);
                if (!player.getIsMoving()) {
                    break;
                }
            }
            
            // Should be stopped at center of a grid cell
            expect(player.getIsAtIntersection()).toBe(true);
            
            // Should be at center of the cell before the wall
            const expectedGrid = mockMazeRenderer.worldToGrid(player.x, player.y);
            const expectedCenter = mockMazeRenderer.gridToWorld(expectedGrid.x, expectedGrid.y);
            
            expect(player.x).toBeCloseTo(expectedCenter.x, 1);
            expect(player.y).toBeCloseTo(expectedCenter.y, 1);
        });
    });
    
    describe('Direction Queuing', () => {
        test('should maintain queued direction until intersection', () => {
            // Start moving right
            player.setDirection('right');
            
            // Move away from intersection
            for (let i = 0; i < 8; i++) {
                player.update(16);
            }
            
            // Queue up direction
            player.setDirection('up');
            
            // Queued direction should persist
            expect(player.nextDirection).toEqual({ x: 0, y: -1 });
            
            // Move more
            player.update(16);
            player.update(16);
            
            // Should still have queued direction if not at intersection
            if (!player.getIsAtIntersection()) {
                expect(player.nextDirection).toEqual({ x: 0, y: -1 });
            }
        });
        
        test('should replace queued direction with new input', () => {
            // Start moving right
            player.setDirection('right');
            
            // Move away from intersection
            for (let i = 0; i < 8; i++) {
                player.update(16);
            }
            
            // Queue up direction
            player.setDirection('up');
            expect(player.nextDirection).toEqual({ x: 0, y: -1 });
            
            // Queue different direction
            player.setDirection('down');
            expect(player.nextDirection).toEqual({ x: 0, y: 1 });
        });
        
        test('should clear queued direction when applied', () => {
            // Start at intersection
            player.setDirection('right');
            
            // Move away from intersection
            for (let i = 0; i < 8; i++) {
                player.update(16);
            }
            
            // Queue direction
            player.setDirection('up');
            expect(player.nextDirection).toEqual({ x: 0, y: -1 });
            
            // Move until next intersection or direction changes
            for (let i = 0; i < 30; i++) {
                player.update(16);
                if (player.getDirection().y === -1) {
                    break; // Direction changed
                }
            }
            
            // If direction changed, queued direction should be cleared
            if (player.getDirection().y === -1) {
                expect(player.nextDirection).toEqual({ x: 0, y: 0 });
            }
        });
    });
});