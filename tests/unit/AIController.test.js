import { AIController } from '../../client/src/components/AIController.js';

// Mock MazeRenderer for testing
class MockMazeRenderer {
    constructor() {
        this.cellSize = 20;
        this.mazeDimensions = { width: 400, height: 300 };
    }
    
    getCellSize() {
        return this.cellSize;
    }
    
    getMazeDimensions() {
        return this.mazeDimensions;
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
    
    worldToScreen(x, y) {
        return { x, y };
    }
    
    isWallAtPosition(x, y) {
        // Simple mock: walls at edges
        return x < this.cellSize || x > this.mazeDimensions.width - this.cellSize ||
               y < this.cellSize || y > this.mazeDimensions.height - this.cellSize;
    }
}

describe('AIController', () => {
    let aiController;
    let mockMazeRenderer;
    
    beforeEach(() => {
        mockMazeRenderer = new MockMazeRenderer();
        aiController = new AIController(mockMazeRenderer);
    });
    
    describe('Constructor', () => {
        test('should initialize with correct default properties', () => {
            expect(aiController.enemies).toEqual([]);
            expect(aiController.mazeRenderer).toBe(mockMazeRenderer);
            expect(aiController.maxEnemies).toBe(4);
            expect(aiController.spawnDelay).toBe(2000);
            expect(aiController.isActive).toBe(true);
            expect(aiController.difficultyLevel).toBe(1);
        });
        
        test('should have correct enemy type probabilities', () => {
            expect(aiController.enemyTypes).toHaveLength(4);
            
            const totalProbability = aiController.enemyTypes.reduce(
                (sum, type) => sum + type.probability, 0
            );
            expect(totalProbability).toBeCloseTo(1.0, 2);
        });
    });
    
    describe('Enemy Spawning', () => {
        test('should calculate spawn positions', () => {
            aiController.calculateSpawnPositions();
            
            expect(aiController.spawnPositions.length).toBeGreaterThan(0);
            
            // All spawn positions should be valid (not walls)
            aiController.spawnPositions.forEach(pos => {
                expect(mockMazeRenderer.isWallAtPosition(pos.x, pos.y)).toBe(false);
            });
        });
        
        test('should select enemy type based on probability', () => {
            const selectedTypes = [];
            
            // Test multiple selections to check distribution
            for (let i = 0; i < 100; i++) {
                const type = aiController.selectEnemyType();
                selectedTypes.push(type);
            }
            
            // Should have selected all available types
            const uniqueTypes = [...new Set(selectedTypes)];
            expect(uniqueTypes.length).toBeGreaterThan(1);
            
            // Each type should be valid
            uniqueTypes.forEach(type => {
                expect(['chaser', 'ambusher', 'patrol', 'random']).toContain(type);
            });
        });
        
        test('should spawn enemy when conditions are met', () => {
            // Set up conditions for spawning
            aiController.lastSpawnTime = aiController.spawnDelay;
            aiController.calculateSpawnPositions();
            
            const initialEnemyCount = aiController.enemies.length;
            aiController.updateEnemySpawning(0, {});
            
            expect(aiController.enemies.length).toBe(initialEnemyCount + 1);
            expect(aiController.enemiesSpawned).toBe(1);
        });
        
        test('should not spawn enemy when max enemies reached', () => {
            // Fill up to max enemies
            aiController.maxEnemies = 2;
            aiController.enemies = [
                { update: jest.fn(), getPosition: () => ({ x: 100, y: 100 }) },
                { update: jest.fn(), getPosition: () => ({ x: 200, y: 200 }) }
            ];
            
            aiController.lastSpawnTime = aiController.spawnDelay;
            aiController.updateEnemySpawning(0, {});
            
            expect(aiController.enemies.length).toBe(2);
        });
    });
    
    describe('Player Tracking', () => {
        test('should update player direction tracking', () => {
            const initialPos = { x: 100, y: 100 };
            const newPos = { x: 110, y: 100 };
            
            aiController.playerLastPosition = initialPos;
            aiController.updatePlayerTracking(newPos);
            
            expect(aiController.playerDirection.x).toBeCloseTo(1, 1);
            expect(aiController.playerDirection.y).toBeCloseTo(0, 1);
            expect(aiController.playerLastPosition).toEqual(newPos);
        });
        
        test('should handle zero movement correctly', () => {
            const pos = { x: 100, y: 100 };
            
            aiController.playerLastPosition = pos;
            aiController.updatePlayerTracking(pos);
            
            expect(aiController.playerDirection.x).toBe(0);
            expect(aiController.playerDirection.y).toBe(0);
        });
    });
    
    describe('Collision Detection', () => {
        test('should detect player-enemy collisions', () => {
            // Add mock enemy
            const mockEnemy = {
                getPosition: () => ({ x: 105, y: 100 }),
                getSize: () => 16
            };
            aiController.enemies.push(mockEnemy);
            
            const playerPos = { x: 100, y: 100 };
            const playerSize = 16;
            
            const collisions = aiController.checkPlayerCollisions(playerPos, playerSize);
            expect(collisions).toHaveLength(1);
            expect(collisions[0]).toBe(mockEnemy);
        });
        
        test('should not detect collision when enemies are far away', () => {
            // Add mock enemy far away
            const mockEnemy = {
                getPosition: () => ({ x: 200, y: 200 }),
                getSize: () => 16
            };
            aiController.enemies.push(mockEnemy);
            
            const playerPos = { x: 100, y: 100 };
            const playerSize = 16;
            
            const collisions = aiController.checkPlayerCollisions(playerPos, playerSize);
            expect(collisions).toHaveLength(0);
        });
    });
    
    describe('Enemy Management', () => {
        test('should remove enemy correctly', () => {
            const mockEnemy = {
                getType: () => 'chaser',
                update: jest.fn()
            };
            aiController.enemies.push(mockEnemy);
            
            const removed = aiController.removeEnemy(mockEnemy);
            expect(removed).toBe(true);
            expect(aiController.enemies).toHaveLength(0);
        });
        
        test('should not remove non-existent enemy', () => {
            const mockEnemy = { getType: () => 'chaser' };
            const otherEnemy = { getType: () => 'ambusher' };
            
            aiController.enemies.push(mockEnemy);
            
            const removed = aiController.removeEnemy(otherEnemy);
            expect(removed).toBe(false);
            expect(aiController.enemies).toHaveLength(1);
        });
        
        test('should set all enemies vulnerable', () => {
            const mockEnemies = [
                { setVulnerable: jest.fn() },
                { setVulnerable: jest.fn() },
                { setVulnerable: jest.fn() }
            ];
            aiController.enemies = mockEnemies;
            
            aiController.setAllEnemiesVulnerable(true, 5000);
            
            mockEnemies.forEach(enemy => {
                expect(enemy.setVulnerable).toHaveBeenCalledWith(true, 5000);
            });
        });
        
        test('should get enemy statistics', () => {
            const mockEnemies = [
                { getIsVulnerable: () => true, getType: () => 'chaser' },
                { getIsVulnerable: () => false, getType: () => 'chaser' },
                { getIsVulnerable: () => false, getType: () => 'ambusher' }
            ];
            aiController.enemies = mockEnemies;
            
            const stats = aiController.getEnemyStats();
            
            expect(stats.total).toBe(3);
            expect(stats.vulnerable).toBe(1);
            expect(stats.chasing).toBe(2);
            expect(stats.byType.chaser).toBe(2);
            expect(stats.byType.ambusher).toBe(1);
        });
    });
    
    describe('Difficulty Scaling', () => {
        test('should set difficulty level correctly', () => {
            aiController.setDifficultyLevel(5);
            
            expect(aiController.difficultyLevel).toBe(5);
            expect(aiController.maxEnemies).toBeGreaterThan(4); // Should increase with difficulty
            expect(aiController.spawnDelay).toBeLessThan(2000); // Should decrease with difficulty
        });
        
        test('should not allow difficulty below 1', () => {
            aiController.setDifficultyLevel(0);
            expect(aiController.difficultyLevel).toBe(1);
            
            aiController.setDifficultyLevel(-5);
            expect(aiController.difficultyLevel).toBe(1);
        });
        
        test('should apply difficulty scaling to enemies', () => {
            const mockEnemy = {
                setSpeed: jest.fn(),
                pathUpdateInterval: 500
            };
            
            aiController.difficultyLevel = 3;
            aiController.applyDifficultyScaling(mockEnemy);
            
            expect(mockEnemy.setSpeed).toHaveBeenCalled();
            const speedCall = mockEnemy.setSpeed.mock.calls[0][0];
            expect(speedCall).toBeGreaterThan(aiController.baseEnemySpeed);
        });
    });
    
    describe('State Management', () => {
        test('should activate and deactivate AI', () => {
            const mockEnemy = {
                direction: { x: 1, y: 0 },
                targetDirection: { x: 1, y: 0 }
            };
            aiController.enemies.push(mockEnemy);
            
            aiController.setActive(false);
            expect(aiController.isActive).toBe(false);
            expect(mockEnemy.direction.x).toBe(0);
            expect(mockEnemy.direction.y).toBe(0);
            
            aiController.setActive(true);
            expect(aiController.isActive).toBe(true);
        });
        
        test('should reset AI controller', () => {
            // Set up some state
            aiController.enemies = [{ type: 'chaser' }];
            aiController.enemiesSpawned = 3;
            aiController.lastSpawnTime = 1000;
            aiController.spawnPositions = [{ x: 100, y: 100 }];
            
            aiController.reset();
            
            expect(aiController.enemies).toHaveLength(0);
            expect(aiController.enemiesSpawned).toBe(0);
            expect(aiController.lastSpawnTime).toBe(0);
            expect(aiController.spawnPositions).toHaveLength(0);
        });
        
        test('should update maze renderer', () => {
            const newMazeRenderer = new MockMazeRenderer();
            const mockEnemy = { mazeRenderer: mockMazeRenderer };
            aiController.enemies.push(mockEnemy);
            
            aiController.setMazeRenderer(newMazeRenderer);
            
            expect(aiController.mazeRenderer).toBe(newMazeRenderer);
            expect(mockEnemy.mazeRenderer).toBe(newMazeRenderer);
        });
    });
    
    describe('Update Method', () => {
        test('should update all enemies', () => {
            const mockEnemies = [
                { 
                    update: jest.fn(),
                    getPosition: () => ({ x: 100, y: 100 })
                },
                { 
                    update: jest.fn(),
                    getPosition: () => ({ x: 200, y: 200 })
                }
            ];
            aiController.enemies = mockEnemies;
            
            const playerPos = { x: 150, y: 150 };
            const gameState = { level: 1 };
            
            aiController.update(16, playerPos, gameState);
            
            mockEnemies.forEach(enemy => {
                expect(enemy.update).toHaveBeenCalledWith(
                    16, 
                    playerPos, 
                    expect.objectContaining({
                        ...gameState,
                        playerDirection: expect.any(Object),
                        difficultyLevel: 1
                    })
                );
            });
        });
        
        test('should not update when inactive', () => {
            const mockEnemy = { 
                update: jest.fn(),
                getPosition: () => ({ x: 100, y: 100 })
            };
            aiController.enemies.push(mockEnemy);
            aiController.setActive(false);
            
            aiController.update(16, { x: 150, y: 150 });
            
            expect(mockEnemy.update).not.toHaveBeenCalled();
        });
        
        test('should remove out-of-bounds enemies', () => {
            const inBoundsEnemy = {
                update: jest.fn(),
                getPosition: () => ({ x: 200, y: 150 })
            };
            const outOfBoundsEnemy = {
                update: jest.fn(),
                getPosition: () => ({ x: -200, y: -200 })
            };
            
            aiController.enemies = [inBoundsEnemy, outOfBoundsEnemy];
            
            aiController.update(16, { x: 150, y: 150 });
            
            expect(aiController.enemies).toHaveLength(1);
            expect(aiController.enemies[0]).toBe(inBoundsEnemy);
        });
    });
    
    describe('Rendering', () => {
        test('should render all enemies', () => {
            const mockCtx = {};
            const mockEnemies = [
                { render: jest.fn() },
                { render: jest.fn() }
            ];
            aiController.enemies = mockEnemies;
            
            aiController.render(mockCtx);
            
            mockEnemies.forEach(enemy => {
                expect(enemy.render).toHaveBeenCalledWith(mockCtx, mockMazeRenderer);
            });
        });
    });
});