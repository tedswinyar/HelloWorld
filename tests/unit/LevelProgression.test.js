import { GameEngine } from '../../client/src/components/GameEngine.js';
import { MazeGenerator } from '../../client/src/components/MazeGenerator.js';

// Mock canvas and context
const mockCanvas = {
    width: 800,
    height: 600
};

const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn()
};

describe('Level Progression System', () => {
    let gameEngine;
    
    beforeEach(() => {
        // Mock DOM elements
        document.getElementById = jest.fn().mockImplementation((id) => {
            const mockElement = { textContent: '' };
            return mockElement;
        });
        
        gameEngine = new GameEngine(mockCanvas, mockCtx);
        
        // Reset to initial state
        gameEngine.resetGame();
        
        // Mock console.log to reduce test output
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        console.log.mockRestore();
    });
    
    describe('Level Completion Detection', () => {
        test('should detect when all pellets are collected', () => {
            // Set up pellets with proper mock structure
            const pellet1 = { 
                collected: false,
                isCollected: function() { return this.collected; },
                collect: function() { this.collected = true; return 10; },
                getType: () => 'normal',
                getPoints: () => 10
            };
            const pellet2 = { 
                collected: false,
                isCollected: function() { return this.collected; },
                collect: function() { this.collected = true; return 10; },
                getType: () => 'normal',
                getPoints: () => 10
            };
            
            gameEngine.pelletManager.pellets = [pellet1, pellet2];
            gameEngine.pelletManager.totalPellets = 2;
            gameEngine.pelletManager.collectedPellets = 0;
            
            expect(gameEngine.pelletManager.areAllPelletsCollected()).toBe(false);
            
            // Collect all pellets
            pellet1.collect();
            pellet2.collect();
            
            expect(gameEngine.pelletManager.areAllPelletsCollected()).toBe(true);
        });
        
        test('should trigger level completion when all pellets collected', () => {
            const initialLevel = gameEngine.gameState.level;
            const initialScore = gameEngine.gameState.score;
            
            // Set up pellets that are all collected
            gameEngine.pelletManager.pellets = [];
            gameEngine.pelletManager.totalPellets = 2;
            gameEngine.pelletManager.collectedPellets = 2;
            
            // Mock areAllPelletsCollected to return true
            gameEngine.pelletManager.areAllPelletsCollected = jest.fn().mockReturnValue(true);
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(2);
            
            // Trigger level completion check
            gameEngine.handlePelletCollection();
            
            expect(gameEngine.gameState.level).toBe(initialLevel + 1);
            expect(gameEngine.gameState.score).toBeGreaterThan(initialScore);
        });
        
        test('should not trigger level completion if no pellets were generated', () => {
            const initialLevel = gameEngine.gameState.level;
            
            // Set up empty pellet state
            gameEngine.pelletManager.pellets = [];
            gameEngine.pelletManager.totalPellets = 0;
            gameEngine.pelletManager.collectedPellets = 0;
            
            gameEngine.pelletManager.areAllPelletsCollected = jest.fn().mockReturnValue(true);
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(0);
            
            gameEngine.handlePelletCollection();
            
            expect(gameEngine.gameState.level).toBe(initialLevel);
        });
    });
    
    describe('Level Advancement', () => {
        test('should advance to next level when completed', () => {
            const initialLevel = gameEngine.gameState.level;
            
            // Mock successful level completion
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(5);
            
            gameEngine.handleLevelComplete();
            
            expect(gameEngine.gameState.level).toBe(initialLevel + 1);
        });
        
        test('should award level completion bonus', () => {
            const initialScore = gameEngine.gameState.score;
            const currentLevel = gameEngine.gameState.level;
            
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(5);
            
            gameEngine.handleLevelComplete();
            
            const expectedBonus = currentLevel * 100;
            expect(gameEngine.gameState.score).toBe(initialScore + expectedBonus);
        });
        
        test('should generate new maze for next level', () => {
            const generateNewMazeSpy = jest.spyOn(gameEngine, 'generateNewMaze');
            
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(5);
            
            gameEngine.handleLevelComplete();
            
            expect(generateNewMazeSpy).toHaveBeenCalled();
        });
    });
    
    describe('Difficulty Progression', () => {
        test('should increase player speed with each level', () => {
            const initialSpeed = gameEngine.player.speed;
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.player.speed).toBeGreaterThan(initialSpeed);
        });
        
        test('should cap player speed at maximum', () => {
            const maxSpeed = 4;
            
            // Set speed close to max
            gameEngine.player.speed = maxSpeed - 0.05;
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.player.speed).toBeLessThanOrEqual(maxSpeed);
        });
        
        test('should increase maze size every 3 levels', () => {
            const initialWidth = gameEngine.mazeGenerator.width;
            const initialHeight = gameEngine.mazeGenerator.height;
            
            // Set level to multiple of 3
            gameEngine.gameState.level = 3;
            
            gameEngine.increaseDifficulty();
            
            // Check if maze size increased (new generator created)
            expect(gameEngine.mazeGenerator.width).toBeGreaterThanOrEqual(initialWidth);
            expect(gameEngine.mazeGenerator.height).toBeGreaterThanOrEqual(initialHeight);
        });
        
        test('should cap maze size at maximum', () => {
            const maxWidth = 61;
            const maxHeight = 41;
            
            // Set maze to near maximum size
            gameEngine.mazeGenerator = new MazeGenerator(maxWidth - 2, maxHeight - 1);
            gameEngine.gameState.level = 6; // Multiple of 3
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.mazeGenerator.width).toBeLessThanOrEqual(maxWidth);
            expect(gameEngine.mazeGenerator.height).toBeLessThanOrEqual(maxHeight);
        });
        
        test('should decrease pellet density with each level', () => {
            const initialDensity = gameEngine.pelletManager.normalPelletDensity;
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.pelletManager.normalPelletDensity).toBeLessThan(initialDensity);
        });
        
        test('should cap pellet density at minimum', () => {
            const minDensity = 0.4;
            
            // Set density close to minimum
            gameEngine.pelletManager.normalPelletDensity = minDensity + 0.01;
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.pelletManager.normalPelletDensity).toBeGreaterThanOrEqual(minDensity);
        });
        
        test('should increase power pellet count every 5 levels', () => {
            const initialPowerPellets = gameEngine.pelletManager.powerPelletCount;
            
            // Set level to multiple of 5
            gameEngine.gameState.level = 5;
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.pelletManager.powerPelletCount).toBeGreaterThan(initialPowerPellets);
        });
        
        test('should cap power pellet count at maximum', () => {
            const maxPowerPellets = 6;
            
            // Set power pellets to near maximum
            gameEngine.pelletManager.powerPelletCount = maxPowerPellets - 1;
            gameEngine.gameState.level = 10; // Multiple of 5
            
            gameEngine.increaseDifficulty();
            
            expect(gameEngine.pelletManager.powerPelletCount).toBeLessThanOrEqual(maxPowerPellets);
        });
    });
    
    describe('Game Reset', () => {
        test('should reset game state to initial values', () => {
            // Modify game state
            gameEngine.gameState.score = 1000;
            gameEngine.gameState.lives = 1;
            gameEngine.gameState.level = 5;
            
            gameEngine.resetGame();
            
            expect(gameEngine.gameState.score).toBe(0);
            expect(gameEngine.gameState.lives).toBe(3);
            expect(gameEngine.gameState.level).toBe(1);
        });
        
        test('should reset player properties', () => {
            // Modify player properties
            gameEngine.player.speed = 4;
            gameEngine.player.direction = { x: 1, y: 0 };
            
            gameEngine.resetGame();
            
            expect(gameEngine.player.speed).toBe(2);
            expect(gameEngine.player.direction).toEqual({ x: 0, y: 0 });
        });
        
        test('should reset maze generator to initial size', () => {
            // Create larger maze
            gameEngine.mazeGenerator = new MazeGenerator(61, 41);
            
            gameEngine.resetGame();
            
            expect(gameEngine.mazeGenerator.width).toBe(41);
            expect(gameEngine.mazeGenerator.height).toBe(31);
        });
        
        test('should reset pellet manager properties', () => {
            // Modify pellet manager properties
            gameEngine.pelletManager.normalPelletDensity = 0.4;
            gameEngine.pelletManager.powerPelletCount = 6;
            
            gameEngine.resetGame();
            
            expect(gameEngine.pelletManager.normalPelletDensity).toBe(0.7);
            expect(gameEngine.pelletManager.powerPelletCount).toBe(4);
        });
    });
    
    describe('Level Information', () => {
        test('should provide current level information', () => {
            const levelInfo = gameEngine.getLevelInfo();
            
            expect(levelInfo).toHaveProperty('level');
            expect(levelInfo).toHaveProperty('playerSpeed');
            expect(levelInfo).toHaveProperty('mazeSize');
            expect(levelInfo).toHaveProperty('pelletDensity');
            expect(levelInfo).toHaveProperty('powerPelletCount');
            
            expect(levelInfo.level).toBe(gameEngine.gameState.level);
            expect(levelInfo.playerSpeed).toBe(gameEngine.player.speed);
            expect(levelInfo.mazeSize.width).toBe(gameEngine.mazeGenerator.width);
            expect(levelInfo.mazeSize.height).toBe(gameEngine.mazeGenerator.height);
        });
    });
    
    describe('UI Updates', () => {
        test('should update level display in UI', () => {
            const mockLevelElement = { textContent: '' };
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (id === 'level-value') return mockLevelElement;
                return { textContent: '' };
            });
            
            gameEngine.gameState.level = 3;
            gameEngine.updateUI();
            
            expect(mockLevelElement.textContent).toBe(3);
        });
    });
    
    describe('Integration Tests', () => {
        test('should complete full level progression cycle', () => {
            const initialLevel = gameEngine.gameState.level;
            const initialScore = gameEngine.gameState.score;
            const initialSpeed = gameEngine.player.speed;
            
            // Set up completed level scenario
            gameEngine.pelletManager.pellets = [];
            gameEngine.pelletManager.totalPellets = 5;
            gameEngine.pelletManager.collectedPellets = 5;
            gameEngine.pelletManager.areAllPelletsCollected = jest.fn().mockReturnValue(true);
            gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(5);
            
            // Trigger level completion
            gameEngine.handlePelletCollection();
            
            // Verify level advanced
            expect(gameEngine.gameState.level).toBe(initialLevel + 1);
            expect(gameEngine.gameState.score).toBeGreaterThan(initialScore);
            expect(gameEngine.player.speed).toBeGreaterThan(initialSpeed);
        });
        
        test('should handle multiple level completions', () => {
            const initialLevel = gameEngine.gameState.level;
            
            // Complete multiple levels
            for (let i = 0; i < 3; i++) {
                gameEngine.pelletManager.getTotalPelletCount = jest.fn().mockReturnValue(5);
                gameEngine.handleLevelComplete();
            }
            
            expect(gameEngine.gameState.level).toBe(initialLevel + 3);
        });
    });
});