import { GameEngine } from '../../client/src/components/GameEngine.js';
import { PelletManager, Pellet } from '../../client/src/components/Pellet.js';

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

describe('Pellet Collection Mechanics', () => {
    let gameEngine;
    
    beforeEach(() => {
        // Mock DOM elements
        document.getElementById = jest.fn().mockImplementation((id) => {
            const mockElement = { textContent: '' };
            return mockElement;
        });
        
        gameEngine = new GameEngine(mockCanvas, mockCtx);
        
        // Reset score to 0 for consistent testing
        gameEngine.gameState.score = 0;
        
        // Mock the maze generation to create a simple test maze
        gameEngine.mazeGenerator.generate = jest.fn().mockReturnValue([
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ]);
        
        gameEngine.mazeGenerator.getAccessiblePositions = jest.fn().mockReturnValue([
            { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
            { x: 1, y: 2 }, { x: 3, y: 2 },
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }
        ]);
        
        // Clear any existing pellets
        gameEngine.pelletManager.clear();
    });
    
    describe('Score Tracking', () => {
        test('should increase score when collecting normal pellets', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create a pellet at player position
            const pellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            gameEngine.pelletManager.pellets = [pellet];
            
            // Handle pellet collection
            gameEngine.handlePelletCollection();
            
            expect(gameEngine.gameState.score).toBe(initialScore + 10);
            expect(pellet.isCollected()).toBe(true);
        });
        
        test('should increase score more for power pellets', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create a power pellet at player position
            const powerPellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'power');
            gameEngine.pelletManager.pellets = [powerPellet];
            
            // Handle pellet collection
            gameEngine.handlePelletCollection();
            
            // Power pellet gives 50 points + 50 bonus = 100 total
            expect(gameEngine.gameState.score).toBe(initialScore + 100);
            expect(powerPellet.isCollected()).toBe(true);
        });
        
        test('should collect multiple pellets in single update', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create multiple pellets at player position
            const pellet1 = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            const pellet2 = new Pellet(gameEngine.player.x + 1, gameEngine.player.y, 'normal');
            const powerPellet = new Pellet(gameEngine.player.x, gameEngine.player.y + 1, 'power');
            
            gameEngine.pelletManager.pellets = [pellet1, pellet2, powerPellet];
            
            // Handle pellet collection
            gameEngine.handlePelletCollection();
            
            // 2 normal pellets (20) + 1 power pellet (50 + 50 bonus) = 120
            expect(gameEngine.gameState.score).toBe(initialScore + 120);
            expect(pellet1.isCollected()).toBe(true);
            expect(pellet2.isCollected()).toBe(true);
            expect(powerPellet.isCollected()).toBe(true);
        });
    });
    
    describe('Pellet Removal', () => {
        test('should remove pellets from rendering after collection', () => {
            // Create pellets
            const pellet1 = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            const pellet2 = new Pellet(200, 200, 'normal'); // Far from player
            
            gameEngine.pelletManager.pellets = [pellet1, pellet2];
            
            // Handle collection
            gameEngine.handlePelletCollection();
            
            // Only pellet1 should be collected
            expect(pellet1.isCollected()).toBe(true);
            expect(pellet2.isCollected()).toBe(false);
            
            // Verify remaining count
            expect(gameEngine.pelletManager.getRemainingPelletCount()).toBe(1);
        });
        
        test('should not collect same pellet twice', () => {
            const initialScore = gameEngine.gameState.score;
            
            const pellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            gameEngine.pelletManager.pellets = [pellet];
            
            // First collection
            gameEngine.handlePelletCollection();
            const scoreAfterFirst = gameEngine.gameState.score;
            
            // Second collection attempt
            gameEngine.handlePelletCollection();
            const scoreAfterSecond = gameEngine.gameState.score;
            
            expect(scoreAfterFirst).toBe(initialScore + 10);
            expect(scoreAfterSecond).toBe(scoreAfterFirst); // No additional points
        });
    });
    
    describe('Collision Detection', () => {
        test('should detect collision within player radius', () => {
            const playerRadius = gameEngine.player.size / 2;
            
            // Create pellet just within collision range
            const pellet = new Pellet(
                gameEngine.player.x + playerRadius - 1,
                gameEngine.player.y,
                'normal'
            );
            
            gameEngine.pelletManager.pellets = [pellet];
            gameEngine.handlePelletCollection();
            
            expect(pellet.isCollected()).toBe(true);
        });
        
        test('should not detect collision outside player radius', () => {
            const playerRadius = gameEngine.player.size / 2;
            
            // Create pellet just outside collision range
            const pellet = new Pellet(
                gameEngine.player.x + playerRadius + 5,
                gameEngine.player.y,
                'normal'
            );
            
            gameEngine.pelletManager.pellets = [pellet];
            gameEngine.handlePelletCollection();
            
            expect(pellet.isCollected()).toBe(false);
        });
        
        test('should handle collision detection with player movement', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create pellet in player's path
            const pellet = new Pellet(
                gameEngine.player.x + 10,
                gameEngine.player.y,
                'normal'
            );
            
            gameEngine.pelletManager.pellets = [pellet];
            
            // Move player towards pellet
            gameEngine.player.direction = { x: 1, y: 0 };
            
            // Update game multiple times to simulate movement
            for (let i = 0; i < 10; i++) {
                gameEngine.update(16); // 16ms per frame
                if (pellet.isCollected()) break;
            }
            
            expect(pellet.isCollected()).toBe(true);
            expect(gameEngine.gameState.score).toBeGreaterThan(initialScore);
        });
    });
    
    describe('UI Updates', () => {
        test('should update pellets remaining display', () => {
            const mockPelletsElement = { textContent: '' };
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (id === 'pellets-remaining') return mockPelletsElement;
                return { textContent: '' };
            });
            
            // Set up pellets
            gameEngine.pelletManager.pellets = [
                new Pellet(100, 100, 'normal'),
                new Pellet(200, 200, 'normal'),
                new Pellet(300, 300, 'power')
            ];
            
            gameEngine.updateUI();
            
            expect(mockPelletsElement.textContent).toBe(3);
            
            // Collect one pellet
            gameEngine.pelletManager.pellets[0].collect();
            gameEngine.updateUI();
            
            expect(mockPelletsElement.textContent).toBe(2);
        });
        
        test('should update score display when pellets collected', () => {
            const mockScoreElement = { textContent: '' };
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (id === 'score-value') return mockScoreElement;
                return { textContent: '' };
            });
            
            const pellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            gameEngine.pelletManager.pellets = [pellet];
            
            gameEngine.handlePelletCollection();
            gameEngine.updateUI();
            
            expect(mockScoreElement.textContent).toBe(10);
        });
    });
    
    describe('Power Pellet Effects', () => {
        test('should trigger power pellet effects', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const initialScore = gameEngine.gameState.score;
            
            const powerPellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'power');
            gameEngine.pelletManager.pellets = [powerPellet];
            
            gameEngine.handlePelletCollection();
            
            expect(consoleSpy).toHaveBeenCalledWith('Power pellet collected! Enemies become vulnerable.');
            expect(gameEngine.gameState.score).toBe(initialScore + 100); // 50 + 50 bonus
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Integration with Game Loop', () => {
        test('should handle pellet collection during game update', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create pellet at player position
            const pellet = new Pellet(gameEngine.player.x, gameEngine.player.y, 'normal');
            gameEngine.pelletManager.pellets = [pellet];
            
            // Run game update
            gameEngine.update(16);
            
            expect(pellet.isCollected()).toBe(true);
            expect(gameEngine.gameState.score).toBe(initialScore + 10);
        });
        
        test('should update pellet animations during game loop', () => {
            const pellet = new Pellet(100, 100, 'power');
            gameEngine.pelletManager.pellets = [pellet];
            
            const initialAnimationTime = pellet.animationTime;
            
            gameEngine.update(16);
            
            expect(pellet.animationTime).toBeGreaterThan(initialAnimationTime);
        });
        
        test('should render pellets during game render', () => {
            const pellet = new Pellet(100, 100, 'normal');
            gameEngine.pelletManager.pellets = [pellet];
            
            jest.clearAllMocks();
            gameEngine.render();
            
            // Should have called rendering methods
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });
    });
});