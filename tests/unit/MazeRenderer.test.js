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
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn()
};

describe('MazeRenderer', () => {
    let renderer;
    let testMaze;
    
    beforeEach(() => {
        renderer = new MazeRenderer(mockCanvas, mockCtx);
        
        // Create a simple test maze
        testMaze = [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ];
        
        // Clear mock calls
        jest.clearAllMocks();
    });
    
    describe('constructor', () => {
        test('should initialize with correct default values', () => {
            expect(renderer.canvas).toBe(mockCanvas);
            expect(renderer.ctx).toBe(mockCtx);
            expect(renderer.cellSize).toBe(20);
            expect(renderer.wallColor).toBe('#0000FF');
            expect(renderer.pathColor).toBe('#000000');
        });
        
        test('should initialize camera with canvas dimensions', () => {
            expect(renderer.camera.width).toBe(800);
            expect(renderer.camera.height).toBe(600);
            expect(renderer.camera.x).toBe(0);
            expect(renderer.camera.y).toBe(0);
        });
    });
    
    describe('setMaze', () => {
        test('should set maze and update dimensions', () => {
            renderer.setMaze(testMaze);
            
            expect(renderer.maze).toBe(testMaze);
            expect(renderer.mazeHeight).toBe(5);
            expect(renderer.mazeWidth).toBe(5);
        });
        
        test('should handle empty maze', () => {
            renderer.setMaze([]);
            
            expect(renderer.maze).toEqual([]);
            expect(renderer.mazeHeight).toBe(0);
            expect(renderer.mazeWidth).toBe(0);
        });
    });
    
    describe('calculateVisibleArea', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
        });
        
        test('should calculate correct visible area at origin', () => {
            renderer.setCameraPosition(0, 0);
            const area = renderer.calculateVisibleArea();
            
            expect(area.startX).toBe(0);
            expect(area.startY).toBe(0);
            expect(area.endX).toBeGreaterThan(0);
            expect(area.endY).toBeGreaterThan(0);
        });
        
        test('should clamp visible area to maze bounds', () => {
            renderer.setCameraPosition(-100, -100);
            const area = renderer.calculateVisibleArea();
            
            expect(area.startX).toBe(0);
            expect(area.startY).toBe(0);
        });
    });
    
    describe('coordinate conversion methods', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
            renderer.setCameraPosition(100, 100);
        });
        
        test('worldToScreen should convert correctly', () => {
            const screen = renderer.worldToScreen(150, 150);
            expect(screen.x).toBe(50);
            expect(screen.y).toBe(50);
        });
        
        test('screenToWorld should convert correctly', () => {
            const world = renderer.screenToWorld(50, 50);
            expect(world.x).toBe(150);
            expect(world.y).toBe(150);
        });
        
        test('worldToGrid should convert correctly', () => {
            const grid = renderer.worldToGrid(45, 65);
            expect(grid.x).toBe(2); // 45 / 20 = 2.25 -> floor = 2
            expect(grid.y).toBe(3); // 65 / 20 = 3.25 -> floor = 3
        });
        
        test('gridToWorld should convert to cell center', () => {
            const world = renderer.gridToWorld(2, 3);
            expect(world.x).toBe(50); // 2 * 20 + 10 = 50
            expect(world.y).toBe(70); // 3 * 20 + 10 = 70
        });
    });
    
    describe('isWallAtPosition', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
        });
        
        test('should return true for wall positions', () => {
            expect(renderer.isWallAtPosition(0, 0)).toBe(true); // Top-left corner
            expect(renderer.isWallAtPosition(45, 45)).toBe(true); // Wall at grid (2,2)
        });
        
        test('should return false for path positions', () => {
            expect(renderer.isWallAtPosition(25, 25)).toBe(false); // Path at grid (1,1)
            expect(renderer.isWallAtPosition(65, 25)).toBe(false); // Path at grid (3,1)
        });
        
        test('should return true for out-of-bounds positions', () => {
            expect(renderer.isWallAtPosition(-10, 50)).toBe(true);
            expect(renderer.isWallAtPosition(50, -10)).toBe(true);
            expect(renderer.isWallAtPosition(1000, 50)).toBe(true);
            expect(renderer.isWallAtPosition(50, 1000)).toBe(true);
        });
        
        test('should return false when no maze is set', () => {
            renderer.setMaze(null);
            expect(renderer.isWallAtPosition(25, 25)).toBe(false);
        });
    });
    
    describe('camera system', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
        });
        
        test('updateCamera should center on target', () => {
            renderer.updateCamera(100, 100);
            
            // With a 5x5 maze (100 pixels) and 800x600 canvas, camera should be clamped to 0
            expect(renderer.camera.x).toBe(0); // Maze is smaller than viewport
            expect(renderer.camera.y).toBe(0); // Maze is smaller than viewport
        });
        
        test('updateCamera should clamp to maze bounds', () => {
            // Create a larger maze for this test
            const largeMaze = Array(50).fill().map(() => Array(50).fill(1));
            renderer.setMaze(largeMaze);
            
            const mazeDimensions = renderer.getMazeDimensions();
            
            // Try to move camera beyond maze bounds
            renderer.updateCamera(mazeDimensions.width + 1000, mazeDimensions.height + 1000);
            
            expect(renderer.camera.x).toBeLessThanOrEqual(mazeDimensions.width - renderer.camera.width);
            expect(renderer.camera.y).toBeLessThanOrEqual(mazeDimensions.height - renderer.camera.height);
        });
        
        test('setCameraPosition should set position directly', () => {
            renderer.setCameraPosition(50, 75);
            
            expect(renderer.camera.x).toBe(50);
            expect(renderer.camera.y).toBe(75);
        });
        
        test('getCameraPosition should return current position', () => {
            renderer.setCameraPosition(123, 456);
            const pos = renderer.getCameraPosition();
            
            expect(pos.x).toBe(123);
            expect(pos.y).toBe(456);
        });
    });
    
    describe('rendering configuration', () => {
        test('getCellSize should return current cell size', () => {
            expect(renderer.getCellSize()).toBe(20);
        });
        
        test('setCellSize should update cell size', () => {
            renderer.setCellSize(25);
            expect(renderer.getCellSize()).toBe(25);
        });
        
        test('setCellSize should enforce minimum size', () => {
            renderer.setCellSize(-5);
            expect(renderer.getCellSize()).toBe(1);
            
            renderer.setCellSize(0);
            expect(renderer.getCellSize()).toBe(1);
        });
        
        test('getMazeDimensions should return correct dimensions', () => {
            renderer.setMaze(testMaze);
            const dimensions = renderer.getMazeDimensions();
            
            expect(dimensions.width).toBe(5 * 20); // 5 cells * 20 pixels
            expect(dimensions.height).toBe(5 * 20); // 5 cells * 20 pixels
        });
        
        test('setColors should update rendering colors', () => {
            renderer.setColors('#FF0000', '#00FF00');
            
            expect(renderer.wallColor).toBe('#FF0000');
            expect(renderer.pathColor).toBe('#00FF00');
        });
    });
    
    describe('render method', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
        });
        
        test('should call clearCanvas', () => {
            renderer.render();
            
            // Should fill canvas with path color
            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
        });
        
        test('should not render without maze', () => {
            renderer.maze = null; // Set maze to null directly to avoid setMaze validation
            renderer.render();
            
            // Should still clear canvas but not render maze cells
            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
        });
        
        test('should render maze borders', () => {
            renderer.render();
            
            // Should call strokeRect for maze borders
            expect(mockCtx.strokeRect).toHaveBeenCalled();
        });
    });
    
    describe('requirements compliance', () => {
        beforeEach(() => {
            renderer.setMaze(testMaze);
        });
        
        test('should support viewport system for maze display (requirement 6.1)', () => {
            // Verify camera system works
            renderer.updateCamera(50, 50);
            const pos = renderer.getCameraPosition();
            
            expect(typeof pos.x).toBe('number');
            expect(typeof pos.y).toBe('number');
            
            // Verify coordinate conversion works
            const screen = renderer.worldToScreen(100, 100);
            expect(typeof screen.x).toBe('number');
            expect(typeof screen.y).toBe('number');
        });
        
        test('should provide visual styling and colors for maze elements (requirement 6.3)', () => {
            // Verify colors are configurable
            renderer.setColors('#123456', '#789ABC');
            expect(renderer.wallColor).toBe('#123456');
            expect(renderer.pathColor).toBe('#789ABC');
            
            // Verify rendering uses colors
            renderer.render();
            // The render method should set fillStyle and strokeStyle
        });
        
        test('should render maze walls and paths (requirement 6.1)', () => {
            // Verify maze can be set and rendered
            expect(renderer.maze).toBe(testMaze);
            
            // Verify rendering functions exist and can be called
            expect(() => renderer.render()).not.toThrow();
            
            // Verify wall detection works
            expect(renderer.isWallAtPosition(0, 0)).toBe(true);
            expect(renderer.isWallAtPosition(25, 25)).toBe(false);
        });
    });
});