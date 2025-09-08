import { Pellet, PelletManager } from '../../client/src/components/Pellet.js';
import { MazeGenerator } from '../../client/src/components/MazeGenerator.js';
import { MazeRenderer } from '../../client/src/components/MazeRenderer.js';

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
    restore: jest.fn()
};

describe('Pellet', () => {
    describe('Normal Pellet', () => {
        let pellet;
        
        beforeEach(() => {
            pellet = new Pellet(100, 100, 'normal');
        });
        
        test('should initialize with correct properties', () => {
            expect(pellet.x).toBe(100);
            expect(pellet.y).toBe(100);
            expect(pellet.type).toBe('normal');
            expect(pellet.collected).toBe(false);
            expect(pellet.size).toBe(3);
            expect(pellet.points).toBe(10);
            expect(pellet.glowEffect).toBe(false);
        });
        
        test('should detect collision correctly', () => {
            // Test collision within range
            expect(pellet.checkCollision(102, 102, 5)).toBe(true);
            
            // Test no collision outside range
            expect(pellet.checkCollision(120, 120, 5)).toBe(false);
            
            // Test edge case - exactly at collision boundary
            const distance = pellet.size / 2 + 5; // radius
            expect(pellet.checkCollision(100 + distance - 0.1, 100, 5)).toBe(true);
            expect(pellet.checkCollision(100 + distance + 0.1, 100, 5)).toBe(false);
        });
        
        test('should collect and return correct points', () => {
            expect(pellet.isCollected()).toBe(false);
            
            const points = pellet.collect();
            expect(points).toBe(10);
            expect(pellet.isCollected()).toBe(true);
            
            // Should not collect again
            const secondPoints = pellet.collect();
            expect(secondPoints).toBe(0);
        });
        
        test('should not detect collision when collected', () => {
            pellet.collect();
            expect(pellet.checkCollision(100, 100, 10)).toBe(false);
        });
        
        test('should update animation time', () => {
            const initialTime = pellet.animationTime;
            pellet.update(100);
            expect(pellet.animationTime).toBeGreaterThan(initialTime);
        });
        
        test('should render when not collected', () => {
            const screenPos = { x: 50, y: 50 };
            pellet.render(mockCtx, screenPos);
            
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });
        
        test('should not render when collected', () => {
            pellet.collect();
            const screenPos = { x: 50, y: 50 };
            
            jest.clearAllMocks();
            pellet.render(mockCtx, screenPos);
            
            expect(mockCtx.beginPath).not.toHaveBeenCalled();
        });
    });
    
    describe('Power Pellet', () => {
        let powerPellet;
        
        beforeEach(() => {
            powerPellet = new Pellet(200, 200, 'power');
        });
        
        test('should initialize with power pellet properties', () => {
            expect(powerPellet.type).toBe('power');
            expect(powerPellet.size).toBe(8);
            expect(powerPellet.points).toBe(50);
            expect(powerPellet.glowEffect).toBe(true);
        });
        
        test('should collect and return correct points', () => {
            const points = powerPellet.collect();
            expect(points).toBe(50);
            expect(powerPellet.isCollected()).toBe(true);
        });
        
        test('should render with glow effect', () => {
            const screenPos = { x: 100, y: 100 };
            powerPellet.render(mockCtx, screenPos);
            
            expect(mockCtx.shadowColor).toBe(powerPellet.color);
            expect(mockCtx.shadowBlur).toBeGreaterThan(0);
        });
    });
});

describe('PelletManager', () => {
    let pelletManager;
    let mazeGenerator;
    let mazeRenderer;
    let testMaze;
    
    beforeEach(() => {
        // Create test maze (5x5 with some paths)
        testMaze = [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ];
        
        mazeGenerator = new MazeGenerator(5, 5);
        mazeRenderer = new MazeRenderer(mockCanvas, mockCtx);
        
        // Mock the getAccessiblePositions method
        mazeGenerator.getAccessiblePositions = jest.fn().mockReturnValue([
            { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
            { x: 1, y: 2 }, { x: 3, y: 2 },
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }
        ]);
        
        // Mock gridToWorld method
        mazeRenderer.gridToWorld = jest.fn().mockImplementation((x, y) => ({
            x: x * 20 + 10,
            y: y * 20 + 10
        }));
        
        // Mock worldToScreen method
        mazeRenderer.worldToScreen = jest.fn().mockImplementation((x, y) => ({
            x: x,
            y: y
        }));
        
        pelletManager = new PelletManager(mazeGenerator, mazeRenderer);
    });
    
    test('should generate pellets in accessible positions', () => {
        pelletManager.generatePellets(testMaze);
        
        expect(pelletManager.getTotalPelletCount()).toBeGreaterThan(0);
        expect(mazeGenerator.getAccessiblePositions).toHaveBeenCalledWith(testMaze);
        
        // Should have both normal and power pellets
        const normalPellets = pelletManager.getPelletsByType('normal');
        const powerPellets = pelletManager.getPelletsByType('power');
        
        expect(normalPellets.length).toBeGreaterThan(0);
        expect(powerPellets.length).toBeGreaterThan(0);
        expect(powerPellets.length).toBeLessThanOrEqual(4); // Max 4 power pellets
    });
    
    test('should place pellets at world coordinates', () => {
        pelletManager.generatePellets(testMaze);
        
        const pellets = pelletManager.pellets;
        expect(pellets.length).toBeGreaterThan(0);
        
        // Check that pellets are placed at converted world coordinates
        for (const pellet of pellets) {
            expect(pellet.x).toBeGreaterThan(0);
            expect(pellet.y).toBeGreaterThan(0);
        }
    });
    
    test('should handle collision detection and collection', () => {
        pelletManager.generatePellets(testMaze);
        
        const initialCount = pelletManager.getRemainingPelletCount();
        expect(initialCount).toBeGreaterThan(0);
        
        // Test collision at first pellet position
        const firstPellet = pelletManager.pellets[0];
        const collectedPellets = pelletManager.checkCollisions(firstPellet.x, firstPellet.y, 10);
        
        expect(collectedPellets.length).toBe(1);
        expect(collectedPellets[0]).toBe(firstPellet);
        expect(pelletManager.getRemainingPelletCount()).toBe(initialCount - 1);
        expect(pelletManager.getCollectedPelletCount()).toBe(1);
    });
    
    test('should detect when all pellets are collected', () => {
        pelletManager.generatePellets(testMaze);
        
        expect(pelletManager.areAllPelletsCollected()).toBe(false);
        
        // Collect all pellets
        for (const pellet of pelletManager.pellets) {
            pellet.collect();
        }
        
        expect(pelletManager.areAllPelletsCollected()).toBe(true);
        expect(pelletManager.getRemainingPelletCount()).toBe(0);
    });
    
    test('should update all pellets', () => {
        pelletManager.generatePellets(testMaze);
        
        const initialAnimationTimes = pelletManager.pellets.map(p => p.animationTime);
        
        pelletManager.update(100);
        
        const updatedAnimationTimes = pelletManager.pellets.map(p => p.animationTime);
        
        for (let i = 0; i < initialAnimationTimes.length; i++) {
            expect(updatedAnimationTimes[i]).toBeGreaterThan(initialAnimationTimes[i]);
        }
    });
    
    test('should render visible pellets', () => {
        pelletManager.generatePellets(testMaze);
        
        jest.clearAllMocks();
        pelletManager.render(mockCtx);
        
        // Should have called rendering methods for visible pellets
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should clear all pellets', () => {
        pelletManager.generatePellets(testMaze);
        expect(pelletManager.getTotalPelletCount()).toBeGreaterThan(0);
        
        pelletManager.clear();
        
        expect(pelletManager.getTotalPelletCount()).toBe(0);
        expect(pelletManager.getRemainingPelletCount()).toBe(0);
        expect(pelletManager.getCollectedPelletCount()).toBe(0);
    });
    
    test('should handle empty maze gracefully', () => {
        mazeGenerator.getAccessiblePositions.mockReturnValue([]);
        
        pelletManager.generatePellets(testMaze);
        
        expect(pelletManager.getTotalPelletCount()).toBe(0);
        expect(pelletManager.areAllPelletsCollected()).toBe(true);
    });
    
    test('should filter pellets by type correctly', () => {
        pelletManager.generatePellets(testMaze);
        
        const normalPellets = pelletManager.getPelletsByType('normal');
        const powerPellets = pelletManager.getPelletsByType('power');
        const invalidPellets = pelletManager.getPelletsByType('invalid');
        
        expect(normalPellets.every(p => p.type === 'normal')).toBe(true);
        expect(powerPellets.every(p => p.type === 'power')).toBe(true);
        expect(invalidPellets.length).toBe(0);
    });
    
    test('should not place power pellets on top of normal pellets', () => {
        pelletManager.generatePellets(testMaze);
        
        const allPositions = pelletManager.pellets.map(p => ({ x: p.x, y: p.y }));
        const uniquePositions = new Set(allPositions.map(p => `${p.x},${p.y}`));
        
        // Should not have overlapping pellets (within 10 pixel threshold)
        expect(uniquePositions.size).toBe(allPositions.length);
    });
});