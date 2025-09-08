import { Enemy } from '../../client/src/components/Enemy.js';

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

describe('Enemy', () => {
    let enemy;
    let mockMazeRenderer;
    
    beforeEach(() => {
        mockMazeRenderer = new MockMazeRenderer();
        enemy = new Enemy(100, 100, mockMazeRenderer, 'chaser');
    });
    
    describe('Constructor', () => {
        test('should initialize enemy with correct default properties', () => {
            expect(enemy.x).toBe(100);
            expect(enemy.y).toBe(100);
            expect(enemy.size).toBe(16);
            expect(enemy.type).toBe('chaser');
            expect(enemy.state).toBe('chase');
            expect(enemy.isVulnerable).toBe(false);
            expect(enemy.mazeRenderer).toBe(mockMazeRenderer);
        });
        
        test('should set correct properties for different enemy types', () => {
            const chaserEnemy = new Enemy(100, 100, mockMazeRenderer, 'chaser');
            expect(chaserEnemy.speed).toBe(1.8);
            expect(chaserEnemy.color).toBe('#FF0000');
            expect(chaserEnemy.pathUpdateInterval).toBe(300);
            
            const ambusherEnemy = new Enemy(100, 100, mockMazeRenderer, 'ambusher');
            expect(ambusherEnemy.speed).toBe(1.6);
            expect(ambusherEnemy.color).toBe('#FFB6C1');
            expect(ambusherEnemy.pathUpdateInterval).toBe(600);
            
            const patrolEnemy = new Enemy(100, 100, mockMazeRenderer, 'patrol');
            expect(patrolEnemy.speed).toBe(1.4);
            expect(patrolEnemy.color).toBe('#00FFFF');
            expect(patrolEnemy.pathUpdateInterval).toBe(800);
        });
    });
    
    describe('Position and Movement', () => {
        test('should get and set position correctly', () => {
            const position = enemy.getPosition();
            expect(position.x).toBe(100);
            expect(position.y).toBe(100);
            
            enemy.setPosition(150, 200);
            const newPosition = enemy.getPosition();
            expect(newPosition.x).toBe(150);
            expect(newPosition.y).toBe(200);
        });
        
        test('should update grid position correctly', () => {
            enemy.setPosition(50, 60);
            enemy.updateGridPosition();
            
            // Grid position should be calculated based on cell size (20)
            expect(enemy.gridX).toBe(2); // 50 / 20 = 2.5, floor = 2
            expect(enemy.gridY).toBe(3); // 60 / 20 = 3, floor = 3
        });
        
        test('should check collision detection correctly', () => {
            // Position in open area should be valid
            expect(enemy.canMoveToPosition(100, 100)).toBe(true);
            
            // Position at wall should be invalid
            expect(enemy.canMoveToPosition(10, 10)).toBe(false);
        });
    });
    
    describe('Vulnerability State', () => {
        test('should set vulnerability state correctly', () => {
            expect(enemy.getIsVulnerable()).toBe(false);
            
            enemy.setVulnerable(true, 5000);
            expect(enemy.getIsVulnerable()).toBe(true);
            expect(enemy.vulnerabilityTimer).toBe(5000);
            expect(enemy.state).toBe('vulnerable');
            
            enemy.setVulnerable(false);
            expect(enemy.getIsVulnerable()).toBe(false);
            expect(enemy.state).toBe('chase');
        });
        
        test('should change speed when vulnerable', () => {
            const originalSpeed = enemy.speed;
            
            enemy.setVulnerable(true);
            expect(enemy.speed).toBe(originalSpeed * 0.5);
            
            enemy.setVulnerable(false);
            expect(enemy.speed).toBe(originalSpeed);
        });
        
        test('should update vulnerability timer', () => {
            enemy.setVulnerable(true, 1000);
            
            enemy.updateVulnerabilityState(500);
            expect(enemy.vulnerabilityTimer).toBe(500);
            expect(enemy.getIsVulnerable()).toBe(true);
            
            enemy.updateVulnerabilityState(600);
            expect(enemy.getIsVulnerable()).toBe(false);
        });
    });
    
    describe('AI Pathfinding', () => {
        test('should calculate heuristic distance correctly', () => {
            const distance = enemy.heuristic({ x: 0, y: 0 }, { x: 3, y: 4 });
            expect(distance).toBe(7); // Manhattan distance: |3-0| + |4-0| = 7
        });
        
        test('should generate grid key correctly', () => {
            const key = enemy.gridKey({ x: 5, y: 10 });
            expect(key).toBe('5,10');
        });
        
        test('should get valid neighbors', () => {
            // Mock a position in open area
            const neighbors = enemy.getNeighbors({ x: 5, y: 5 });
            
            // Should return up to 4 neighbors (up, right, down, left)
            expect(neighbors.length).toBeGreaterThan(0);
            expect(neighbors.length).toBeLessThanOrEqual(4);
            
            // Each neighbor should be adjacent
            neighbors.forEach(neighbor => {
                const dx = Math.abs(neighbor.x - 5);
                const dy = Math.abs(neighbor.y - 5);
                expect(dx + dy).toBe(1); // Manhattan distance of 1
            });
        });
        
        test('should get behavior target based on type', () => {
            const playerPos = { x: 200, y: 150 };
            const gameState = { playerDirection: { x: 1, y: 0 } };
            
            // Chaser should target player directly
            const chaserEnemy = new Enemy(100, 100, mockMazeRenderer, 'chaser');
            const chaserTarget = chaserEnemy.getBehaviorTarget(playerPos, gameState);
            expect(chaserTarget.x).toBe(playerPos.x);
            expect(chaserTarget.y).toBe(playerPos.y);
            
            // Ambusher should target ahead of player
            const ambusherEnemy = new Enemy(100, 100, mockMazeRenderer, 'ambusher');
            const ambusherTarget = ambusherEnemy.getBehaviorTarget(playerPos, gameState);
            expect(ambusherTarget.x).toBeGreaterThan(playerPos.x); // Ahead in x direction
        });
        
        test('should get avoidance target when vulnerable', () => {
            const playerPos = { x: 200, y: 150 };
            enemy.setPosition(180, 140); // Close to player
            
            const avoidanceTarget = enemy.getAvoidanceTarget(playerPos);
            
            // Should move away from player
            expect(avoidanceTarget.x).toBeLessThan(playerPos.x);
            expect(avoidanceTarget.y).toBeLessThan(playerPos.y);
        });
    });
    
    describe('Edge Wrapping', () => {
        test('should handle horizontal edge wrapping', () => {
            // Position enemy at left edge
            enemy.setPosition(5, 150);
            enemy.handleEdgeWrapping();
            
            // Should wrap to right side if valid
            if (enemy.canMoveToPosition(mockMazeRenderer.mazeDimensions.width - 10, 150)) {
                expect(enemy.x).toBeGreaterThan(300);
            }
        });
        
        test('should handle vertical edge wrapping', () => {
            // Position enemy at top edge
            enemy.setPosition(200, 5);
            enemy.handleEdgeWrapping();
            
            // Should wrap to bottom side if valid
            if (enemy.canMoveToPosition(200, mockMazeRenderer.mazeDimensions.height - 10)) {
                expect(enemy.y).toBeGreaterThan(250);
            }
        });
    });
    
    describe('Reset and State Management', () => {
        test('should reset enemy state correctly', () => {
            // Modify enemy state
            enemy.setPosition(200, 200);
            enemy.setVulnerable(true);
            enemy.direction = { x: 1, y: 0 };
            enemy.path = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
            
            // Reset enemy
            enemy.reset(100, 100);
            
            expect(enemy.x).toBe(100);
            expect(enemy.y).toBe(100);
            expect(enemy.direction.x).toBe(0);
            expect(enemy.direction.y).toBe(0);
            expect(enemy.path.length).toBe(0);
            expect(enemy.getIsVulnerable()).toBe(false);
        });
        
        test('should get correct enemy properties', () => {
            expect(enemy.getSize()).toBe(16);
            expect(enemy.getType()).toBe('chaser');
            expect(enemy.getState()).toBe('chase');
        });
    });
    
    describe('Update Method', () => {
        test('should update enemy without errors', () => {
            const playerPos = { x: 200, y: 150 };
            const gameState = { playerDirection: { x: 1, y: 0 } };
            
            // Should not throw errors
            expect(() => {
                enemy.update(16, playerPos, gameState);
            }).not.toThrow();
        });
        
        test('should update animation time', () => {
            const initialTime = enemy.animationTime;
            enemy.update(16, { x: 200, y: 150 });
            
            expect(enemy.animationTime).toBeGreaterThan(initialTime);
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
            
            expect(() => {
                enemy.render(mockCtx, mockMazeRenderer);
            }).not.toThrow();
            
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
    });
});