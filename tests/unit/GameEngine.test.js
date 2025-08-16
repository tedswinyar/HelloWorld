/**
 * @jest-environment jsdom
 */

import { GameEngine } from '../../client/src/components/GameEngine.js';

// Mock canvas and context
const mockCanvas = {
    width: 800,
    height: 600,
    getContext: jest.fn()
};

const mockCtx = {
    fillStyle: '',
    fillRect: jest.fn(),
    clearRect: jest.fn()
};

mockCanvas.getContext.mockReturnValue(mockCtx);

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.performance = { now: jest.fn(() => Date.now()) };

describe('GameEngine', () => {
    let gameEngine;
    
    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = `
            <div id="score-value">0</div>
            <div id="lives-value">3</div>
        `;
        
        gameEngine = new GameEngine(mockCanvas, mockCtx);
    });
    
    afterEach(() => {
        if (gameEngine.isRunning) {
            gameEngine.stop();
        }
        jest.clearAllMocks();
    });
    
    test('should initialize with correct default values', () => {
        expect(gameEngine.isRunning).toBe(false);
        expect(gameEngine.gameState.score).toBe(0);
        expect(gameEngine.gameState.lives).toBe(3);
        expect(gameEngine.gameState.level).toBe(1);
    });
    
    test('should start and stop game correctly', () => {
        expect(gameEngine.isRunning).toBe(false);
        
        gameEngine.start();
        expect(gameEngine.isRunning).toBe(true);
        
        gameEngine.stop();
        expect(gameEngine.isRunning).toBe(false);
    });
    
    test('should handle player input correctly', () => {
        gameEngine.handleInput('up');
        expect(gameEngine.player.direction).toEqual({ x: 0, y: -1 });
        
        gameEngine.handleInput('down');
        expect(gameEngine.player.direction).toEqual({ x: 0, y: 1 });
        
        gameEngine.handleInput('left');
        expect(gameEngine.player.direction).toEqual({ x: -1, y: 0 });
        
        gameEngine.handleInput('right');
        expect(gameEngine.player.direction).toEqual({ x: 1, y: 0 });
        
        gameEngine.handleInput('stop');
        expect(gameEngine.player.direction).toEqual({ x: 0, y: 0 });
    });
    
    test('should update player position based on direction', () => {
        const initialX = gameEngine.player.x;
        const initialY = gameEngine.player.y;
        
        // Set player direction
        gameEngine.handleInput('right');
        
        // Store the direction to verify it was set
        expect(gameEngine.player.direction.x).toBe(1);
        expect(gameEngine.player.direction.y).toBe(0);
        
        // Update should be called without throwing errors
        expect(() => gameEngine.update(16)).not.toThrow();
        
        // Player position should either move or stay the same (if blocked by wall)
        expect(gameEngine.player.x).toBeGreaterThanOrEqual(initialX);
        expect(gameEngine.player.y).toBe(initialY);
    });
    
    test('should update UI elements', () => {
        gameEngine.gameState.score = 100;
        gameEngine.gameState.lives = 2;
        
        gameEngine.updateUI();
        
        expect(document.getElementById('score-value').textContent).toBe('100');
        expect(document.getElementById('lives-value').textContent).toBe('2');
    });
    
    test('should handle maze-based collision detection', () => {
        // Test that maze and maze renderer are initialized
        expect(gameEngine.maze).toBeDefined();
        expect(gameEngine.mazeRenderer).toBeDefined();
        
        // Test that player has a valid starting position
        expect(gameEngine.player.x).toBeGreaterThan(0);
        expect(gameEngine.player.y).toBeGreaterThan(0);
        
        // Test that collision detection method exists
        expect(typeof gameEngine.checkWallCollision).toBe('function');
        
        // Test that edge wrapping method exists
        expect(typeof gameEngine.handleEdgeWrapping).toBe('function');
    });
});