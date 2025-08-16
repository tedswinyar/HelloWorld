/**
 * Unit tests for Player class
 * Tests player movement, collision detection, and edge wrapping functionality
 */

import { Player } from '../../client/src/components/Player.js';

// Mock MazeRenderer for testing
class MockMazeRenderer {
    constructor() {
        this.cellSize = 20;
        this.mazeWidth = 800;
        this.mazeHeight = 600;
        this.walls = new Set(); // Set of "x,y" strings representing wall positions
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
        return { x, y }; // Simplified for testing
    }
    
    addWall(gridX, gridY) {
        this.walls.add(`${gridX},${gridY}`);
    }
    
    removeWall(gridX, gridY) {
        this.walls.delete(`${gridX},${gridY}`);
    }
}

describe('Player', () => {
    let player;
    let mockMazeRenderer;
    
    beforeEach(() => {
        mockMazeRenderer = new MockMazeRenderer();
        player = new Player(100, 100, mockMazeRenderer);
    });
    
    describe('Constructor', () => {
        test('should initialize with correct default values', () => {
            expect(player.x).toBe(100);
            expect(player.y).toBe(100);
            expect(player.size).toBe(16);
            expect(player.speed).toBe(2);
            expect(player.lives).toBe(3);
            expect(player.direction).toEqual({ x: 0, y: 0 });
            expect(player.nextDirection).toEqual({ x: 0, y: 0 });
            expect(player.isMoving).toBe(false);
        });
    });
    
    describe('Movement', () => {
        test('should move right when direction is set to right', () => {
            const initialX = player.x;
            player.setDirection('right');
            player.update(16); // Simulate one frame
            
            expect(player.x).toBeGreaterThan(initialX);
            expect(player.direction).toEqual({ x: 1, y: 0 });
            expect(player.isMoving).toBe(true);
        });
        
        test('should move left when direction is set to left', () => {
            const initialX = player.x;
            player.setDirection('left');
            player.update(16);
            
            expect(player.x).toBeLessThan(initialX);
            expect(player.direction).toEqual({ x: -1, y: 0 });
            expect(player.isMoving).toBe(true);
        });
        
        test('should move up when direction is set to up', () => {
            const initialY = player.y;
            player.setDirection('up');
            player.update(16);
            
            expect(player.y).toBeLessThan(initialY);
            expect(player.direction).toEqual({ x: 0, y: -1 });
            expect(player.isMoving).toBe(true);
        });
        
        test('should move down when direction is set to down', () => {
            const initialY = player.y;
            player.setDirection('down');
            player.update(16);
            
            expect(player.y).toBeGreaterThan(initialY);
            expect(player.direction).toEqual({ x: 0, y: 1 });
            expect(player.isMoving).toBe(true);
        });
        
        test('should continue moving until hitting a wall or changing direction', () => {
            player.setDirection('right');
            player.update(16);
            expect(player.isMoving).toBe(true);
            
            // Player should continue moving right
            const initialX = player.x;
            player.update(16);
            expect(player.x).toBeGreaterThan(initialX);
            expect(player.direction).toEqual({ x: 1, y: 0 });
        });
        
        test('should move at correct speed', () => {
            const initialX = player.x;
            player.setDirection('right');
            player.update(16);
            
            const expectedX = initialX + player.speed;
            expect(player.x).toBeCloseTo(expectedX, 1);
        });
    });
    
    describe('Collision Detection', () => {
        test('should not move through walls', () => {
            // Add a wall to the right of the player
            const playerGridX = Math.floor((player.x + player.size/2 + player.speed) / mockMazeRenderer.cellSize);
            const playerGridY = Math.floor(player.y / mockMazeRenderer.cellSize);
            mockMazeRenderer.addWall(playerGridX, playerGridY);
            
            const initialX = player.x;
            player.setDirection('right');
            player.update(16);
            
            // Player should not have moved
            expect(player.x).toBe(initialX);
            expect(player.direction).toEqual({ x: 0, y: 0 });
            expect(player.isMoving).toBe(false);
        });
        
        test('should detect collision with all four corners of player bounding box', () => {
            const testX = 200;
            const testY = 200;
            
            // Add walls at all corners
            const halfSize = player.size / 2;
            const corners = [
                { x: testX - halfSize, y: testY - halfSize }, // Top-left
                { x: testX + halfSize, y: testY - halfSize }, // Top-right
                { x: testX - halfSize, y: testY + halfSize }, // Bottom-left
                { x: testX + halfSize, y: testY + halfSize }  // Bottom-right
            ];
            
            corners.forEach((corner, index) => {
                const gridX = Math.floor(corner.x / mockMazeRenderer.cellSize);
                const gridY = Math.floor(corner.y / mockMazeRenderer.cellSize);
                mockMazeRenderer.addWall(gridX, gridY);
                
                expect(player.canMoveToPosition(testX, testY)).toBe(false);
                
                mockMazeRenderer.removeWall(gridX, gridY);
            });
        });
        
        test('should allow movement to valid positions', () => {
            const testX = 200;
            const testY = 200;
            
            expect(player.canMoveToPosition(testX, testY)).toBe(true);
        });
    });
    
    describe('Edge Wrapping', () => {
        test('should wrap from left edge to right edge', () => {
            // Position player near left edge
            player.setPosition(mockMazeRenderer.cellSize / 4, 100);
            
            // Trigger edge wrapping
            player.handleEdgeWrapping();
            
            // Player should be moved to right edge
            const expectedX = mockMazeRenderer.mazeWidth - mockMazeRenderer.cellSize / 2;
            expect(player.x).toBeCloseTo(expectedX, 1);
        });
        
        test('should wrap from right edge to left edge', () => {
            // Position player near right edge
            player.setPosition(mockMazeRenderer.mazeWidth - mockMazeRenderer.cellSize / 4, 100);
            
            // Trigger edge wrapping
            player.handleEdgeWrapping();
            
            // Player should be moved to left edge
            const expectedX = mockMazeRenderer.cellSize / 2;
            expect(player.x).toBeCloseTo(expectedX, 1);
        });
        
        test('should wrap from top edge to bottom edge', () => {
            // Position player near top edge
            player.setPosition(100, mockMazeRenderer.cellSize / 4);
            
            // Trigger edge wrapping
            player.handleEdgeWrapping();
            
            // Player should be moved to bottom edge
            const expectedY = mockMazeRenderer.mazeHeight - mockMazeRenderer.cellSize / 2;
            expect(player.y).toBeCloseTo(expectedY, 1);
        });
        
        test('should wrap from bottom edge to top edge', () => {
            // Position player near bottom edge
            player.setPosition(100, mockMazeRenderer.mazeHeight - mockMazeRenderer.cellSize / 4);
            
            // Trigger edge wrapping
            player.handleEdgeWrapping();
            
            // Player should be moved to top edge
            const expectedY = mockMazeRenderer.cellSize / 2;
            expect(player.y).toBeCloseTo(expectedY, 1);
        });
        
        test('should not wrap if destination has walls', () => {
            // Add wall at right edge
            const rightEdgeGridX = Math.floor((mockMazeRenderer.mazeWidth - mockMazeRenderer.cellSize / 2) / mockMazeRenderer.cellSize);
            const playerGridY = Math.floor(player.y / mockMazeRenderer.cellSize);
            mockMazeRenderer.addWall(rightEdgeGridX, playerGridY);
            
            // Position player near left edge
            const initialX = mockMazeRenderer.cellSize / 4;
            player.setPosition(initialX, 100);
            
            // Trigger edge wrapping
            player.handleEdgeWrapping();
            
            // Player should not have wrapped due to wall
            expect(player.x).toBe(initialX);
        });
    });
    
    describe('Animation', () => {
        test('should update animation time when moving', () => {
            const initialAnimationTime = player.animationTime;
            player.setDirection('right');
            player.update(16);
            
            expect(player.animationTime).toBeGreaterThan(initialAnimationTime);
        });
        
        test('should have mouth animation when moving', () => {
            player.setDirection('right');
            player.update(100); // Longer time for visible animation
            
            expect(player.mouthAngle).toBeGreaterThan(0);
        });
        
        test('should have closed mouth when not moving', () => {
            player.setDirection('stop');
            player.update(16);
            
            expect(player.mouthAngle).toBe(0);
        });
    });
    
    describe('Getters and Setters', () => {
        test('should get and set position correctly', () => {
            player.setPosition(150, 200);
            const position = player.getPosition();
            
            expect(position.x).toBe(150);
            expect(position.y).toBe(200);
        });
        
        test('should get direction correctly', () => {
            player.setDirection('up');
            const direction = player.getDirection();
            
            expect(direction).toEqual({ x: 0, y: -1 });
        });
        
        test('should get and set speed correctly', () => {
            player.setSpeed(5);
            expect(player.getSpeed()).toBe(5);
            
            // Should not allow negative speed
            player.setSpeed(-1);
            expect(player.getSpeed()).toBe(0);
        });
        
        test('should get size correctly', () => {
            expect(player.getSize()).toBe(16);
        });
        
        test('should get moving state correctly', () => {
            expect(player.getIsMoving()).toBe(false);
            
            player.setDirection('right');
            player.update(16);
            expect(player.getIsMoving()).toBe(true);
        });
    });
    
    describe('Stop and Reset', () => {
        test('should stop player movement when stop() is called', () => {
            player.setDirection('right');
            player.update(16);
            expect(player.isMoving).toBe(true);
            
            player.stop();
            expect(player.direction).toEqual({ x: 0, y: 0 });
            expect(player.nextDirection).toEqual({ x: 0, y: 0 });
            expect(player.isMoving).toBe(false);
        });
        
        test('should reset player to initial state', () => {
            // Modify player state
            player.setDirection('right');
            player.update(16);
            player.animationTime = 100;
            
            // Reset player
            player.reset(50, 75);
            
            expect(player.x).toBe(50);
            expect(player.y).toBe(75);
            expect(player.direction).toEqual({ x: 0, y: 0 });
            expect(player.nextDirection).toEqual({ x: 0, y: 0 });
            expect(player.isMoving).toBe(false);
            expect(player.animationTime).toBe(0);
            expect(player.mouthAngle).toBe(0);
        });
    });
    
    describe('Rendering', () => {
        test('should render without errors', () => {
            const mockCtx = {
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                stroke: jest.fn(),
                lineTo: jest.fn()
            };
            
            // Should not throw any errors
            expect(() => {
                player.render(mockCtx, mockMazeRenderer);
            }).not.toThrow();
            
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
    });
});