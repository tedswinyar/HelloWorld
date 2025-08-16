/**
 * Test to understand the exact coordinate system and fix wall placement
 */

import { Player } from '../../client/src/components/Player.js';

class CoordinateTestRenderer {
    constructor() {
        this.cellSize = 20;
        this.walls = new Set();
    }
    
    getCellSize() { return this.cellSize; }
    getMazeDimensions() { return { width: 800, height: 600 }; }
    
    isWallAtPosition(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return this.walls.has(`${gridX},${gridY}`);
    }
    
    worldToScreen(x, y) { return { x, y }; }
    
    addWall(gridX, gridY) { 
        this.walls.add(`${gridX},${gridY}`); 
    }
    
    getGridPosition(x, y) {
        return {
            x: Math.floor(x / this.cellSize),
            y: Math.floor(y / this.cellSize)
        };
    }
}

describe('Coordinate System Test', () => {
    let player;
    let renderer;
    
    beforeEach(() => {
        renderer = new CoordinateTestRenderer();
        player = new Player(50, 50, renderer); // Start at (50, 50)
    });
    
    test('should understand player position and movement collision', () => {
        // Player at (50, 50) with size 16 and speed 2
        expect(renderer.getGridPosition(50, 50)).toEqual({ x: 2, y: 2 });
        
        // When player moves up by speed 2, new position is (50, 48)
        // Player bounding box at (50, 48):
        const newY = 50 - 2; // 48
        const halfSize = player.size / 2; // 8
        
        const topLeft = { x: 50 - halfSize, y: newY - halfSize };     // (42, 40)
        const topRight = { x: 50 + halfSize, y: newY - halfSize };    // (58, 40)
        const bottomLeft = { x: 50 - halfSize, y: newY + halfSize };  // (42, 56)
        const bottomRight = { x: 50 + halfSize, y: newY + halfSize }; // (58, 56)
        
        console.log('Player bounding box corners when moving up:');
        console.log('Top-left:', topLeft, '-> grid:', renderer.getGridPosition(topLeft.x, topLeft.y));
        console.log('Top-right:', topRight, '-> grid:', renderer.getGridPosition(topRight.x, topRight.y));
        console.log('Bottom-left:', bottomLeft, '-> grid:', renderer.getGridPosition(bottomLeft.x, bottomLeft.y));
        console.log('Bottom-right:', bottomRight, '-> grid:', renderer.getGridPosition(bottomRight.x, bottomRight.y));
        
        // All corners should be in grid (2, 2) or (2, 1)
        expect(renderer.getGridPosition(topLeft.x, topLeft.y)).toEqual({ x: 2, y: 2 });
        expect(renderer.getGridPosition(topRight.x, topRight.y)).toEqual({ x: 2, y: 2 });
        expect(renderer.getGridPosition(bottomLeft.x, bottomLeft.y)).toEqual({ x: 2, y: 2 });
        expect(renderer.getGridPosition(bottomRight.x, bottomRight.y)).toEqual({ x: 2, y: 2 });
        
        // To block upward movement, we need a wall at grid (2, 2) or (2, 1)
        // Let's try grid (2, 1) which covers y coordinates 20-40
        renderer.addWall(2, 1);
        
        // Now test if upward movement is blocked
        const canMoveUp = player.canMoveInDirection({ x: 0, y: -1 });
        console.log('Can move up with wall at (2,1):', canMoveUp);
        
        // The top corners at y=40 should be at the boundary of grid (2,1) and (2,2)
        // Grid (2,1) covers y=20-39, Grid (2,2) covers y=40-59
        // So y=40 should be in grid (2,2), not blocked by wall at (2,1)
        expect(canMoveUp).toBe(true); // Should be able to move up
        
        // To actually block movement, we need wall at (2,2) where player currently is
        renderer.addWall(2, 2);
        const canMoveUpWithWallInSameCell = player.canMoveInDirection({ x: 0, y: -1 });
        console.log('Can move up with wall at (2,2):', canMoveUpWithWallInSameCell);
        expect(canMoveUpWithWallInSameCell).toBe(false);
    });
    
    test('should find correct wall position to block upward movement', () => {
        // Player at (50, 50), moving up to (50, 48)
        // We need to find which grid cell would actually block this movement
        
        // Test different wall positions
        const testPositions = [
            { grid: { x: 2, y: 0 }, desc: 'far above' },
            { grid: { x: 2, y: 1 }, desc: 'one cell above' },
            { grid: { x: 2, y: 2 }, desc: 'same cell' }
        ];
        
        for (const test of testPositions) {
            // Clear all walls
            renderer.walls.clear();
            
            // Add wall at test position
            renderer.addWall(test.grid.x, test.grid.y);
            
            const canMove = player.canMoveInDirection({ x: 0, y: -1 });
            console.log(`Wall at grid (${test.grid.x}, ${test.grid.y}) [${test.desc}]: canMoveUp = ${canMove}`);
        }
        
        // Based on the results, we should know which position blocks movement
    });
});