/**
 * @jest-environment jsdom
 */

import { InputHandler } from '../../client/src/utils/InputHandler.js';

// Mock GameEngine
const mockGameEngine = {
    handleInput: jest.fn()
};

describe('InputHandler', () => {
    let inputHandler;
    
    beforeEach(() => {
        inputHandler = new InputHandler(mockGameEngine);
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        inputHandler.destroy();
    });
    
    test('should initialize correctly', () => {
        expect(inputHandler.gameEngine).toBe(mockGameEngine);
        expect(inputHandler.keys).toEqual({});
    });
    
    test('should identify game keys correctly', () => {
        expect(inputHandler.isGameKey('ArrowUp')).toBe(true);
        expect(inputHandler.isGameKey('ArrowDown')).toBe(true);
        expect(inputHandler.isGameKey('ArrowLeft')).toBe(true);
        expect(inputHandler.isGameKey('ArrowRight')).toBe(true);
        expect(inputHandler.isGameKey('KeyW')).toBe(true);
        expect(inputHandler.isGameKey('KeyA')).toBe(true);
        expect(inputHandler.isGameKey('KeyS')).toBe(true);
        expect(inputHandler.isGameKey('KeyD')).toBe(true);
        expect(inputHandler.isGameKey('KeyX')).toBe(false);
    });
    
    test('should handle arrow key input', () => {
        // Simulate arrow up key press
        const upEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
        inputHandler.handleKeyDown(upEvent);
        
        expect(inputHandler.keys['ArrowUp']).toBe(true);
        expect(mockGameEngine.handleInput).toHaveBeenCalledWith('up');
    });
    
    test('should handle WASD key input', () => {
        // Simulate W key press
        const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
        inputHandler.handleKeyDown(wEvent);
        
        expect(inputHandler.keys['KeyW']).toBe(true);
        expect(mockGameEngine.handleInput).toHaveBeenCalledWith('up');
    });
    
    test('should handle key release without stopping', () => {
        // Press and release key
        const downEvent = new KeyboardEvent('keydown', { code: 'ArrowRight' });
        const upEvent = new KeyboardEvent('keyup', { code: 'ArrowRight' });
        
        inputHandler.handleKeyDown(downEvent);
        expect(inputHandler.keys['ArrowRight']).toBe(true);
        expect(mockGameEngine.handleInput).toHaveBeenCalledWith('right');
        
        jest.clearAllMocks();
        
        inputHandler.handleKeyUp(upEvent);
        expect(inputHandler.keys['ArrowRight']).toBe(false);
        
        // Should not send any command on key release (continuous movement)
        expect(mockGameEngine.handleInput).not.toHaveBeenCalled();
    });
    
    test('should not send commands for conflicting keys', () => {
        // Press multiple conflicting keys
        inputHandler.keys['ArrowUp'] = true;
        inputHandler.keys['ArrowDown'] = true;
        inputHandler.updatePlayerDirection();
        
        // Should not send any command when conflicting keys are pressed
        expect(mockGameEngine.handleInput).not.toHaveBeenCalled();
        
        // Release one key, should now send command for remaining key
        inputHandler.keys['ArrowDown'] = false;
        inputHandler.updatePlayerDirection();
        
        expect(mockGameEngine.handleInput).toHaveBeenCalledWith('up');
    });
});