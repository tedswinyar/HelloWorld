/**
 * Test to verify that turning into a wall doesn't cause midway stops
 * This reproduces the specific issue where player can stop midway by turning into a wall
 */

import { Player } from '../../client/src/components/Player.js';

// Mock renderer for testing wall collision scenarios
class WallTestRenderer {
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
    
    isAtGridCenter(x, y, tolerance = 2) {
        const centerX = Math.floor(x / this.cellSize) * this.cellSize + this.cellSize / 2;
        const centerY = Math.floor(y / this.cellSize) * this.cellSize + this.cellSize / 2;
        return Math.abs(x - centerX) <= tolerance && Math.abs(y - centerY) <= tolerance;
    }
}

describe('Turn Into Wall Prevention', () => {
    let player;
    let renderer;
    
    beforeEach(() => {
        renderer = new WallTestRenderer();
        player = new Player(50, 50, renderer); // Start at grid center (2,2)
    });
    
    test('should continue moving when trying to turn into wall', () => {
        // Create a scenario where player can move right but not up
        // Player starts at (50, 50) which is grid (2, 2)
        // We'll create walls that block upward movement but allow rightward movement
        
        // Add walls above the player's path to block upward movement
        // When player moves right, they'll be at positions like (52, 50), (54, 50), etc.
        // To block upward movement from these positions, we need walls above
        renderer.addWall(2, 1); // Above starting position
        renderer.addWall(3, 1); // Above next position to the right
        renderer.addWall(4, 1); // Above further right positions
        
        // Start moving right (should be valid)
        player.setDirection('right');
        player.update(16);
        
        // Verify player is moving right
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
        
        // Move a bit to get between grid centers
        for (let i = 0; i < 5; i++) {
            player.update(16);
        }
        
        // Player should now be between grid centers
        expect(player.x).toBeGreaterThan(50);
        expect(renderer.isAtGridCenter(player.x, player.y)).toBe(false);
        
        // Verify that upward movement is indeed blocked at current position
        const canMoveUpFromCurrentPosition = player.canMoveInDirection({ x: 0, y: -1 });
        expect(canMoveUpFromCurrentPosition).toBe(false);
        
        // Try to turn up into the wall
        player.setDirection('up');
        
        // Player should continue moving right (not stop midway)
        // The invalid direction should be cleared and not affect current movement
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
        
        // Continue moving
        for (let i = 0; i < 10; i++) {
            player.update(16);
        }
        
        // Player should still be moving right
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
    });
    
    test('should not queue invalid directions that could cause stops', () => {
        // Add walls to create a corridor
        renderer.addWall(2, 1); // Wall above
        renderer.addWall(2, 3); // Wall below
        
        // Start moving right
        player.setDirection('right');
        player.update(16);
        
        // Move to between grid centers
        for (let i = 0; i < 3; i++) {
            player.update(16);
        }
        
        // Try to turn into wall above
        player.setDirection('up');
        
        // nextDirection should be cleared since it's invalid
        expect(player.nextDirection).toEqual({ x: 0, y: 0 });
        
        // Player should continue moving right
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
    });
    
    test('should handle multiple invalid direction attempts', () => {
        // Create walls around starting position except right
        renderer.addWall(2, 1); // Wall above
        renderer.addWall(2, 3); // Wall below
        renderer.addWall(1, 2); // Wall left
        
        // Start moving right
        player.setDirection('right');
        player.update(16);
        
        // Move between grid centers
        for (let i = 0; i < 4; i++) {
            player.update(16);
        }
        
        const positionBeforeAttempts = { x: player.x, y: player.y };
        
        // Try multiple invalid directions
        player.setDirection('up');    // Invalid - wall
        player.update(16);
        player.setDirection('down');  // Invalid - wall
        player.update(16);
        player.setDirection('left');  // Invalid - wall
        player.update(16);
        
        // Player should have continued moving right throughout
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
        expect(player.x).toBeGreaterThan(positionBeforeAttempts.x);
    });
    
    test('should allow valid direction changes even after invalid attempts', () => {
        // Create L-shaped corridor
        renderer.addWall(2, 1); // Wall above starting position
        
        // Start moving right
        player.setDirection('right');
        
        // Move to next grid center
        for (let i = 0; i < 10; i++) {
            player.update(16);
        }
        
        // Try invalid direction first
        player.setDirection('up'); // Should be invalid due to wall
        
        // Then try valid direction
        player.setDirection('down'); // Should be valid
        
        // Should change to down direction
        expect(player.getDirection()).toEqual({ x: 0, y: 1 });
        expect(player.getIsMoving()).toBe(true);
    });
    
    test('should only stop at grid centers when hitting walls in current direction', () => {
        // Add wall that will block forward movement
        renderer.addWall(5, 2); // Wall ahead in right direction
        
        // Start moving right
        player.setDirection('right');
        
        // Move until hitting the wall
        let iterations = 0;
        while (iterations < 100 && player.getIsMoving()) {
            player.update(16);
            iterations++;
        }
        
        // Should have stopped at a grid center
        expect(player.getIsMoving()).toBe(false);
        expect(renderer.isAtGridCenter(player.x, player.y)).toBe(true);
        
        // Should have moved from starting position
        expect(player.x).toBeGreaterThan(50);
    });
    
    test('should handle rapid direction changes without stopping', () => {
        // Start moving right
        player.setDirection('right');
        
        // Rapidly try different directions while moving
        for (let i = 0; i < 20; i++) {
            player.update(16);
            
            // Try random invalid directions
            if (i % 3 === 0) player.setDirection('up');
            if (i % 3 === 1) player.setDirection('down');
            if (i % 3 === 2) player.setDirection('left');
        }
        
        // Should still be moving right
        expect(player.getDirection()).toEqual({ x: 1, y: 0 });
        expect(player.getIsMoving()).toBe(true);
        expect(player.x).toBeGreaterThan(100); // Moved significantly
    });
});