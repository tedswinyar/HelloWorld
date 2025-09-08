/**
 * Tests for enemy-player collision system
 * Verifies collision detection, life management, and respawn functionality
 */

import { GameEngine } from '../../client/src/components/GameEngine.js';
import { Player } from '../../client/src/components/Player.js';
import { Enemy } from '../../client/src/components/Enemy.js';
import { AIController } from '../../client/src/components/AIController.js';

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

describe('Enemy-Player Collision System', () => {
    let gameEngine;
    
    beforeEach(() => {
        gameEngine = new GameEngine(mockCanvas, mockCtx);
        gameEngine.generateNewMaze();
    });
    
    afterEach(() => {
        gameEngine.stop();
    });
    
    describe('Collision Detection', () => {
        test('should detect collision between player and enemy', () => {
            const playerPos = { x: 100, y: 100 };
            const enemyPos = { x: 105, y: 105 }; // Close enough for collision
            
            gameEngine.player.setPosition(playerPos.x, playerPos.y);
            
            // Add an enemy at collision position
            const enemy = new Enemy(enemyPos.x, enemyPos.y, gameEngine.getMazeRenderer(), 'chaser');
            gameEngine.aiController.enemies.push(enemy);
            
            const collisions = gameEngine.aiController.checkPlayerCollisions(playerPos, 16);
            
            expect(collisions).toHaveLength(1);
            expect(collisions[0]).toBe(enemy);
        });
        
        test('should not detect collision when player and enemy are far apart', () => {
            const playerPos = { x: 100, y: 100 };
            const enemyPos = { x: 200, y: 200 }; // Far from player
            
            gameEngine.player.setPosition(playerPos.x, playerPos.y);
            
            // Add an enemy at distant position
            const enemy = new Enemy(enemyPos.x, enemyPos.y, gameEngine.getMazeRenderer(), 'chaser');
            gameEngine.aiController.enemies.push(enemy);
            
            const collisions = gameEngine.aiController.checkPlayerCollisions(playerPos, 16);
            
            expect(collisions).toHaveLength(0);
        });
    });
    
    describe('Life Management', () => {
        test('should lose life when hit by non-vulnerable enemy', () => {
            const initialLives = gameEngine.gameState.lives;
            
            // Create a non-vulnerable enemy
            const enemy = new Enemy(100, 100, gameEngine.getMazeRenderer(), 'chaser');
            enemy.setVulnerable(false);
            
            // Simulate collision
            gameEngine.handleEnemyHitPlayer(enemy);
            
            expect(gameEngine.gameState.lives).toBe(initialLives - 1);
        });
        
        test('should trigger game over when lives reach zero', () => {
            // Set lives to 1
            gameEngine.gameState.lives = 1;
            
            const stopSpy = jest.spyOn(gameEngine, 'stop');
            const setActiveSpy = jest.spyOn(gameEngine.aiController, 'setActive');
            
            // Create a non-vulnerable enemy
            const enemy = new Enemy(100, 100, gameEngine.getMazeRenderer(), 'chaser');
            enemy.setVulnerable(false);
            
            // Simulate collision that should trigger game over
            gameEngine.handleEnemyHitPlayer(enemy);
            
            expect(gameEngine.gameState.lives).toBe(0);
            expect(stopSpy).toHaveBeenCalled();
            expect(setActiveSpy).toHaveBeenCalledWith(false);
        });
        
        test('should award points when eating vulnerable enemy', () => {
            const initialScore = gameEngine.gameState.score;
            
            // Create a vulnerable enemy
            const enemy = new Enemy(100, 100, gameEngine.getMazeRenderer(), 'chaser');
            enemy.setVulnerable(true);
            
            // Simulate eating vulnerable enemy
            gameEngine.handleVulnerableEnemyCollision(enemy);
            
            expect(gameEngine.gameState.score).toBeGreaterThan(initialScore);
        });
    });
    
    describe('Respawn System', () => {
        test('should set invulnerability period after respawn', (done) => {
            // Set lives to more than 1 to avoid game over
            gameEngine.gameState.lives = 2;
            
            // Trigger respawn
            gameEngine.respawnPlayer();
            
            // Check that respawning flag is set
            expect(gameEngine.isRespawning).toBe(true);
            
            // Wait for respawn delay
            setTimeout(() => {
                expect(gameEngine.isRespawning).toBe(false);
                expect(gameEngine.invulnerabilityTime).toBeGreaterThan(0);
                done();
            }, 1100); // Slightly longer than respawn delay
        });
        
        test('should ignore collisions during invulnerability period', () => {
            const initialLives = gameEngine.gameState.lives;
            
            // Set invulnerability
            gameEngine.invulnerabilityTime = 1000;
            
            // Try to handle enemy collisions
            gameEngine.handleEnemyCollisions();
            
            // Lives should not change during invulnerability
            expect(gameEngine.gameState.lives).toBe(initialLives);
        });
    });
    
    describe('Power Pellet Effects', () => {
        test('should make enemies vulnerable when power pellet is collected', () => {
            // Add some enemies
            const enemy1 = new Enemy(100, 100, gameEngine.getMazeRenderer(), 'chaser');
            const enemy2 = new Enemy(200, 200, gameEngine.getMazeRenderer(), 'ambusher');
            
            gameEngine.aiController.enemies.push(enemy1, enemy2);
            
            // Collect power pellet
            gameEngine.handlePowerPelletCollection();
            
            // Check that enemies are vulnerable
            expect(enemy1.getIsVulnerable()).toBe(true);
            expect(enemy2.getIsVulnerable()).toBe(true);
        });
    });
    
    describe('Enemy Points System', () => {
        test('should award correct points for different enemy types', () => {
            expect(gameEngine.getEnemyPoints('chaser')).toBe(200);
            expect(gameEngine.getEnemyPoints('ambusher')).toBe(400);
            expect(gameEngine.getEnemyPoints('patrol')).toBe(300);
            expect(gameEngine.getEnemyPoints('random')).toBe(100);
            expect(gameEngine.getEnemyPoints('ghost')).toBe(200);
            expect(gameEngine.getEnemyPoints('unknown')).toBe(200); // Default
        });
    });
});