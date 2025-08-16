/**
 * Tests for continuous movement behavior
 * Verifies that player continues moving until a new direction is pressed
 */

import { InputHandler } from '../../client/src/utils/InputHandler.js';

// Mock GameEngine for testing
class MockGameEngine {
    constructor() {
        this.lastDirection = null;
        this.directionHistory = [];
    }
    
    handleInput(direction) {
        this.lastDirection = direction;
        this.directionHistory.push(direction);
    }
}

describe('Continuous Movement', () => {
    let inputHandler;
    let mockGameEngine;
    
    beforeEach(() => {
        mockGameEngine = new MockGameEngine();
        inputHandler = new InputHandler(mockGameEngine);
        
        // Clear any existing key states
        inputHandler.keys = {};
    });
    
    afterEach(() => {
        inputHandler.destroy();
    });
    
    describe('Key Press Behavior', () => {
        test('should set direction when key is pressed', () => {
            // Simulate pressing right arrow key
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.updatePlayerDirection();
            
            expect(mockGameEngine.lastDirection).toBe('right');
        });
        
        test('should not send stop command when key is released', () => {
            // Press right key
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('right');
            
            // Release right key
            inputHandler.keys['ArrowRight'] = false;
            inputHandler.updatePlayerDirection();
            
            // Should not have sent a 'stop' command
            expect(mockGameEngine.directionHistory).not.toContain('stop');
            expect(mockGameEngine.directionHistory).toEqual(['right']);
        });
        
        test('should change direction when new key is pressed', () => {
            // Press right key
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('right');
            
            // Release right key and press up key
            inputHandler.keys['ArrowRight'] = false;
            inputHandler.keys['ArrowUp'] = true;
            inputHandler.updatePlayerDirection();
            
            expect(mockGameEngine.lastDirection).toBe('up');
            expect(mockGameEngine.directionHistory).toEqual(['right', 'up']);
        });
        
        test('should handle WASD keys same as arrow keys', () => {
            // Test W key (up)
            inputHandler.keys['KeyW'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('up');
            
            // Test A key (left)
            inputHandler.keys['KeyW'] = false;
            inputHandler.keys['KeyA'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('left');
            
            // Test S key (down)
            inputHandler.keys['KeyA'] = false;
            inputHandler.keys['KeyS'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('down');
            
            // Test D key (right)
            inputHandler.keys['KeyS'] = false;
            inputHandler.keys['KeyD'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('right');
        });
        
        test('should prioritize single direction when multiple keys pressed', () => {
            // Press both up and down (conflicting)
            inputHandler.keys['ArrowUp'] = true;
            inputHandler.keys['ArrowDown'] = true;
            inputHandler.updatePlayerDirection();
            
            // Should not send any direction for conflicting keys
            expect(mockGameEngine.directionHistory).toEqual([]);
            
            // Release down, keep up
            inputHandler.keys['ArrowDown'] = false;
            inputHandler.updatePlayerDirection();
            
            expect(mockGameEngine.lastDirection).toBe('up');
        });
        
        test('should handle rapid key changes', () => {
            const directions = ['right', 'down', 'left', 'up'];
            const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
            
            for (let i = 0; i < directions.length; i++) {
                // Clear previous keys
                inputHandler.keys = {};
                
                // Press new key
                inputHandler.keys[keys[i]] = true;
                inputHandler.updatePlayerDirection();
                
                expect(mockGameEngine.lastDirection).toBe(directions[i]);
            }
            
            expect(mockGameEngine.directionHistory).toEqual(directions);
        });
    });
    
    describe('No Stop Commands', () => {
        test('should never send stop command during normal gameplay', () => {
            // Simulate a sequence of key presses and releases
            const keySequence = [
                { key: 'ArrowRight', pressed: true },
                { key: 'ArrowRight', pressed: false },
                { key: 'ArrowUp', pressed: true },
                { key: 'ArrowUp', pressed: false },
                { key: 'ArrowLeft', pressed: true },
                { key: 'ArrowLeft', pressed: false },
                { key: 'ArrowDown', pressed: true },
                { key: 'ArrowDown', pressed: false }
            ];
            
            for (const action of keySequence) {
                inputHandler.keys[action.key] = action.pressed;
                inputHandler.updatePlayerDirection();
            }
            
            // Verify no 'stop' commands were sent
            expect(mockGameEngine.directionHistory).not.toContain('stop');
            
            // Should only contain direction changes
            const expectedDirections = ['right', 'up', 'left', 'down'];
            expect(mockGameEngine.directionHistory).toEqual(expectedDirections);
        });
        
        test('should not send commands when no keys are pressed initially', () => {
            // Start with no keys pressed
            inputHandler.updatePlayerDirection();
            
            expect(mockGameEngine.directionHistory).toEqual([]);
            expect(mockGameEngine.lastDirection).toBeNull();
        });
        
        test('should not send duplicate direction commands', () => {
            // Press right key multiple times
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.updatePlayerDirection();
            inputHandler.updatePlayerDirection();
            inputHandler.updatePlayerDirection();
            
            // Should only send one 'right' command
            expect(mockGameEngine.directionHistory).toEqual(['right']);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle simultaneous key press and release', () => {
            // Press right and up simultaneously
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.keys['ArrowUp'] = true;
            inputHandler.updatePlayerDirection();
            
            // Should prioritize up (first in the condition check)
            expect(mockGameEngine.lastDirection).toBe('up');
            
            // Release up, keep right
            inputHandler.keys['ArrowUp'] = false;
            inputHandler.updatePlayerDirection();
            
            expect(mockGameEngine.lastDirection).toBe('right');
        });
        
        test('should handle all keys released after movement', () => {
            // Press and release a key
            inputHandler.keys['ArrowRight'] = true;
            inputHandler.updatePlayerDirection();
            expect(mockGameEngine.lastDirection).toBe('right');
            
            // Release all keys
            inputHandler.keys = {};
            inputHandler.updatePlayerDirection();
            
            // Should not send any new commands
            expect(mockGameEngine.directionHistory).toEqual(['right']);
        });
    });
});