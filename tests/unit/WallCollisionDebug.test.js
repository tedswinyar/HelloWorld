/**
 * Debug test to verify wall collision detection is working correctly
 */

import { Player } from '../../client/src/components/Player.js';

class DebugRenderer {
    constructor() {
        this.cellSize = 20;
        this.walls = new Set();
    }
    
    getCellSize() { return this.cellSize; }
    getMazeDimensions() { return { width: 800, height: 600 }; }
    
    isWallAtPosition(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        const hasWall = this.walls.has(`${gridX},${gridY}`);
        console.log(`Checking wall at world(${x}, ${y}) -> grid(${gridX}, ${gridY}): ${hasWall}`);
        return hasWall;
    }
    
    worldToScreen(x, y) { return { x, y }; }
    
    addWall(gridX, gridY) { 
        console.log(`Adding wall at grid(${gridX}, ${gridY})`);
        this.walls.add(`${gridX},${gridY}`); 
    }
    
    logPlayerPosition(player) {
        const gridX = Math.floor(player.x / this.cellSize);
        const gridY = Math.floor(player.y / this.cellSize);
        console.log(`Player at world(${player.x}, ${player.y}) -> grid(${gridX}, ${gridY})`);
    }
}

describe('Wall Collision Debug', () => {
    let player;
    let renderer;
    
    beforeEach(() => {
        renderer = new DebugRenderer();
        player = new Player(50, 50, renderer); // Grid position (2, 2)
        console.log('=== Test Setup ===');
        renderer.logPlayerPosition(player);
    });
    
    test('should detect wall collision correctly', () => {
        // Player is at (50, 50) which is grid (2, 2)
        // To block upward movement, we need a wall at grid (2, 1)
        // But let's verify the grid calculation first
        
        // Player at (50, 50) -> grid (2, 2)
        expect(Math.floor(50 / 20)).toBe(2);
        expect(Math.floor(50 / 20)).toBe(2);
        
        // When player moves up by speed 2, they go to (50, 48)
        // Player bounding box at (50, 48) with size 16:
        // Top edge at y = 48 - 8 = 40
        // Grid position of y=40: floor(40/20) = 2
        // So the player's top edge would be at grid row 2, not row 1
        
        // To actually block the player, we need a wall at grid (2, 2) or adjacent
        // Let's put wall directly above at the position the player would move to
        renderer.addWall(2, 2); // Same cell as player - should block all movement
        
        const canMoveUp = player.canMoveInDirection({ x: 0, y: -1 });
        const canMoveRight = player.canMoveInDirection({ x: 1, y: 0 });
        const canMoveDown = player.canMoveInDirection({ x: 0, y: 1 });
        const canMoveLeft = player.canMoveInDirection({ x: -1, y: 0 });
        
        // All directions should be blocked since there's a wall in the same cell
        expect(canMoveUp).toBe(false);
        expect(canMoveRight).toBe(false);
        expect(canMoveDown).toBe(false);
        expect(canMoveLeft).toBe(false);
    });
    
    test('should verify wall placement calculation', () => {
        // Player at (50, 50) should be at grid (2, 2)
        expect(Math.floor(50 / 20)).toBe(2);
        
        // Wall at grid (2, 1) should be at world coordinates (40-60, 0-20)
        renderer.addWall(2, 1);
        
        // Test specific positions in the wall grid
        expect(renderer.isWallAtPosition(40, 0)).toBe(true);   // Top-left of wall cell
        expect(renderer.isWallAtPosition(50, 10)).toBe(true);  // Center of wall cell
        expect(renderer.isWallAtPosition(59, 19)).toBe(true);  // Bottom-right of wall cell
        expect(renderer.isWallAtPosition(50, 30)).toBe(false); // Below wall cell
        
        // Test player movement collision
        // Player at (50, 50) with size 16, moving up by speed 2 to (50, 48)
        // Player bounding box at (50, 48) would be:
        // Top-left: (42, 40), Top-right: (58, 40)
        // Bottom-left: (42, 56), Bottom-right: (58, 56)
        
        // The top corners (42, 40) and (58, 40) should NOT be in the wall at grid (2,1)
        // because grid (2,1) covers y=0-20, but player top is at y=40
        expect(renderer.isWallAtPosition(42, 40)).toBe(false);
        expect(renderer.isWallAtPosition(58, 40)).toBe(false);
    });
});