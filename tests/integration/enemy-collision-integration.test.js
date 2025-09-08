/**
 * Integration test for enemy-player collision system
 * Tests the complete collision workflow in a realistic game scenario
 */

import { GameEngine } from '../../client/src/components/GameEngine.js';

// Mock canvas and context
const mockCanvas = {
    width: 800,
    height: 600
};

const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    lineTo: jest.fn()
};

describe('Enemy-Player Collision Integration', () => {
    let gameEngine;
    
    beforeEach(() => {
        gameEngine = new GameEngine(mockCanvas, mockCtx);
        gameEngine.generateNewMaze();
        gameEngine.start();
    });
    
    afterEach(() => {
        gameEngine.stop();
    });
    
    test('should handle complete collision workflow', async () => {
        const initialLives = gameEngine.gameState.lives;
        const initialScore = gameEngine.gameState.score;
        
        // Position player and enemy for collision
        const playerPos = { x: 100, y: 100 };
        gameEngine.player.setPosition(playerPos.x, playerPos.y);
        
        // Add a non-vulnerable enemy at collision position
        const enemy = gameEngine.aiController.enemies[0] || 
                     (() => {
                         gameEngine.aiController.spawnEnemy();
                         return gameEngine.aiController.enemies[0];
                     })();
        
        if (enemy) {
            enemy.setPosition(playerPos.x + 5, playerPos.y + 5); // Close enough for collision
            enemy.setVulnerable(false);
            
            // Update game to trigger collision detection
            gameEngine.update(16);
            
            // Should have lost a life
            expect(gameEngine.gameState.lives).toBe(initialLives - 1);
            expect(gameEngine.isRespawning).toBe(true);
            
            // Wait for respawn
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // Should be respawned with invulnerability
            expect(gameEngine.isRespawning).toBe(false);
            expect(gameEngine.invulnerabilityTime).toBeGreaterThan(0);
        }
    });
    
    test('should handle power pellet vulnerability workflow', () => {
        const initialScore = gameEngine.gameState.score;
        
        // Add an enemy
        gameEngine.aiController.spawnEnemy();
        const enemy = gameEngine.aiController.enemies[0];
        
        if (enemy) {
            // Collect power pellet to make enemies vulnerable
            gameEngine.handlePowerPelletCollection();
            
            // Enemy should be vulnerable
            expect(enemy.getIsVulnerable()).toBe(true);
            
            // Position for collision
            const playerPos = gameEngine.player.getPosition();
            enemy.setPosition(playerPos.x + 5, playerPos.y + 5);
            
            // Update to trigger collision
            gameEngine.update(16);
            
            // Should have gained points and enemy should be removed
            expect(gameEngine.gameState.score).toBeGreaterThan(initialScore);
            expect(gameEngine.aiController.enemies.length).toBe(0);
        }
    });
    
    test('should handle game over scenario', () => {
        // Set lives to 1
        gameEngine.gameState.lives = 1;
        
        // Add enemy and trigger collision
        gameEngine.aiController.spawnEnemy();
        const enemy = gameEngine.aiController.enemies[0];
        
        if (enemy) {
            enemy.setVulnerable(false);
            const playerPos = gameEngine.player.getPosition();
            enemy.setPosition(playerPos.x + 5, playerPos.y + 5);
            
            // Update to trigger collision and game over
            gameEngine.update(16);
            
            // Should trigger game over
            expect(gameEngine.gameState.lives).toBe(0);
            expect(gameEngine.isRunning).toBe(false);
            expect(gameEngine.aiController.isActive).toBe(false);
        }
    });
    
    test('should ignore collisions during invulnerability', () => {
        const initialLives = gameEngine.gameState.lives;
        
        // Set invulnerability
        gameEngine.invulnerabilityTime = 2000;
        
        // Add enemy and position for collision
        gameEngine.aiController.spawnEnemy();
        const enemy = gameEngine.aiController.enemies[0];
        
        if (enemy) {
            enemy.setVulnerable(false);
            const playerPos = gameEngine.player.getPosition();
            enemy.setPosition(playerPos.x + 5, playerPos.y + 5);
            
            // Update - should not lose life due to invulnerability
            gameEngine.update(16);
            
            expect(gameEngine.gameState.lives).toBe(initialLives);
        }
    });
});