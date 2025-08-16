/**
 * Integration test for continuous movement behavior
 * Tests the complete flow from input to player movement
 */

import { Player } from '../../client/src/components/Player.js';
import { InputHandler } from '../../client/src/utils/InputHandler.js';

// Mock MazeRenderer for testing
class MockMazeRenderer {
    constructor() {
        this.cellSize = 20;
        this.mazeWidth = 800;
        this.mazeHeight = 600;
    }
    
    getCellSize() { return this.cellSize; }
    getMazeDimensions() { return { width: this.mazeWidth, height: this.mazeHeight }; }
    isWallAtPosition() { return false; } // No walls for this test
    worldToScreen(x, y) { return { x, y }; }
}

// Mock GameEngine that uses Player class
class MockGameEngine {
    constructor() {
        this.mazeRenderer = new MockMazeRenderer();
        this.player = new Player(100, 100, this.mazeRenderer);
    }
    
    handleInput(direction) {
        this.player.setDirection(direction);
    }
    
    update(deltaTime) {
        this.player.update(deltaTime);
    }
}

describe('Continuous Movement Integration', () => {
    let gameEngine;
    let inputHandler;
    
    beforeEach(() => {
        gameEngine = new MockGameEngine();
        inputHandler = new InputHandler(gameEngine);
    });
    
    afterEach(() => {
        inputHandler.destroy();
    });
    
    test('should demonstrate continuous movement behavior', () => {
        const initialX = gameEngine.player.x;
        
        // Simulate pressing right arrow key
        inputHandler.keys['ArrowRight'] = true;
        inputHandler.updatePlayerDirection();
        
        // Player should start moving right
        expect(gameEngine.player.getDirection()).toEqual({ x: 1, y: 0 });
        
        // Update player multiple times (simulate game loop)
        for (let i = 0; i < 5; i++) {
            gameEngine.update(16);
        }
        
        // Player should have moved right
        expect(gameEngine.player.x).toBeGreaterThan(initialX);
        const positionAfterMoving = gameEngine.player.x;
        
        // Simulate releasing the right arrow key
        inputHandler.keys['ArrowRight'] = false;
        inputHandler.updatePlayerDirection();
        
        // Player should continue moving right (no stop command sent)
        expect(gameEngine.player.getDirection()).toEqual({ x: 1, y: 0 });
        
        // Update player more times
        for (let i = 0; i < 5; i++) {
            gameEngine.update(16);
        }
        
        // Player should have continued moving right
        expect(gameEngine.player.x).toBeGreaterThan(positionAfterMoving);
    });
    
    test('should change direction when new key is pressed', () => {
        // Start moving right
        inputHandler.keys['ArrowRight'] = true;
        inputHandler.updatePlayerDirection();
        gameEngine.update(16);
        
        expect(gameEngine.player.getDirection()).toEqual({ x: 1, y: 0 });
        const initialY = gameEngine.player.y;
        
        // Release right key first, then press up key
        inputHandler.keys['ArrowRight'] = false;
        inputHandler.keys['ArrowUp'] = true;
        inputHandler.updatePlayerDirection();
        
        // Should change to up direction
        expect(gameEngine.player.getDirection()).toEqual({ x: 0, y: -1 });
        
        // Update player
        for (let i = 0; i < 5; i++) {
            gameEngine.update(16);
        }
        
        // Player should have moved up
        expect(gameEngine.player.y).toBeLessThan(initialY);
        
        // Release up key
        inputHandler.keys['ArrowUp'] = false;
        inputHandler.updatePlayerDirection();
        
        // Should continue moving up
        expect(gameEngine.player.getDirection()).toEqual({ x: 0, y: -1 });
    });
    
    test('should handle rapid direction changes', () => {
        const directions = [
            { key: 'ArrowRight', expected: { x: 1, y: 0 } },
            { key: 'ArrowDown', expected: { x: 0, y: 1 } },
            { key: 'ArrowLeft', expected: { x: -1, y: 0 } },
            { key: 'ArrowUp', expected: { x: 0, y: -1 } }
        ];
        
        for (const dir of directions) {
            // Clear all keys
            inputHandler.keys = {};
            
            // Press new key
            inputHandler.keys[dir.key] = true;
            inputHandler.updatePlayerDirection();
            
            // Should change direction immediately
            expect(gameEngine.player.getDirection()).toEqual(dir.expected);
            
            // Update player
            gameEngine.update(16);
            
            // Should be moving in new direction
            expect(gameEngine.player.getIsMoving()).toBe(true);
        }
    });
});