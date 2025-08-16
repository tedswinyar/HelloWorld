/**
 * Simple test to verify collision detection in the exact scenario
 */

import { Player } from '../../client/src/components/Player.js';

class SimpleRenderer {
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
    addWall(gridX, gridY) { this.walls.add(`${gridX},${gridY}`); }
}

describe('Simple Collision Test', () => {
    test('should block movement into wall at same grid position', () => {
        const renderer = new SimpleRenderer();
        const player = new Player(50, 50, renderer); // Grid (2,2)
        
        // Add wall at same position as player
        renderer.addWall(2, 2);
        
        // Should not be able to move in any direction
        expect(player.canMoveInDirection({ x: 0, y: -1 })).toBe(false); // up
        expect(player.canMoveInDirection({ x: 0, y: 1 })).toBe(false);  // down
        expect(player.canMoveInDirection({ x: -1, y: 0 })).toBe(false); // left
        expect(player.canMoveInDirection({ x: 1, y: 0 })).toBe(false);  // right
    });
    
    test('should demonstrate the actual problem scenario', () => {
        const renderer = new SimpleRenderer();
        const player = new Player(50, 50, renderer); // Grid (2,2)
        
        // Create a corridor - no walls initially
        // Player should be able to move right
        expect(player.canMoveInDirection({ x: 1, y: 0 })).toBe(true);
        
        // Start moving right
        player.setDirection('right');
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        
        // Move to between grid centers
        player.update(16); // Now at (52, 50)
        player.update(16); // Now at (54, 50)
        player.update(16); // Now at (56, 50)
        
        // Player should be between grid centers
        expect(player.x).toBe(56);
        expect(Math.floor(player.x / 20)).toBe(2); // Still in grid column 2
        
        // Now add walls that would block upward movement
        // Player at (56, 50) spans grid columns 2 and 3
        // To block upward movement, add walls at both (2, 1) and (3, 1)
        renderer.addWall(2, 1);
        renderer.addWall(3, 1);
        
        // Test if upward movement is blocked
        const canMoveUp = player.canMoveInDirection({ x: 0, y: -1 });
        
        // Try to change direction up
        const originalDirection = player.getDirection();
        player.setDirection('up');
        const newDirection = player.getDirection();
        
        // Debug: show the values
        expect(canMoveUp).toBe(false); // Should be blocked by wall
        expect(newDirection).toEqual(originalDirection); // Direction should not change
    });
});