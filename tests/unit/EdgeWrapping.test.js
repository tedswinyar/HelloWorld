/**
 * Comprehensive tests for maze edge wrapping functionality
 * Tests edge cases and smooth transitions for player wrapping
 */

import { Player } from '../../client/src/components/Player.js';

// Enhanced Mock MazeRenderer for edge wrapping tests
class EdgeWrappingMockMazeRenderer {
    constructor(width = 800, height = 600, cellSize = 20) {
        this.cellSize = cellSize;
        this.mazeWidth = width;
        this.mazeHeight = height;
        this.walls = new Set();
        
        // Create border walls except for specific wrapping tunnels
        this.createBorderWalls();
        this.createWrappingTunnels();
    }
    
    createBorderWalls() {
        const gridWidth = Math.floor(this.mazeWidth / this.cellSize);
        const gridHeight = Math.floor(this.mazeHeight / this.cellSize);
        
        // Top and bottom borders
        for (let x = 0; x < gridWidth; x++) {
            this.walls.add(`${x},0`); // Top border
            this.walls.add(`${x},${gridHeight - 1}`); // Bottom border
        }
        
        // Left and right borders
        for (let y = 0; y < gridHeight; y++) {
            this.walls.add(`0,${y}`); // Left border
            this.walls.add(`${gridWidth - 1},${y}`); // Right border
        }
    }
    
    createWrappingTunnels() {
        const gridHeight = Math.floor(this.mazeHeight / this.cellSize);
        const midY = Math.floor(gridHeight / 2);
        
        // Create horizontal wrapping tunnels in the middle
        this.walls.delete(`0,${midY}`); // Left tunnel
        this.walls.delete(`${Math.floor(this.mazeWidth / this.cellSize) - 1},${midY}`); // Right tunnel
        
        // Create vertical wrapping tunnels
        const gridWidth = Math.floor(this.mazeWidth / this.cellSize);
        const midX = Math.floor(gridWidth / 2);
        this.walls.delete(`${midX},0`); // Top tunnel
        this.walls.delete(`${midX},${gridHeight - 1}`); // Bottom tunnel
    }
    
    getCellSize() {
        return this.cellSize;
    }
    
    getMazeDimensions() {
        return {
            width: this.mazeWidth,
            height: this.mazeHeight
        };
    }
    
    isWallAtPosition(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return this.walls.has(`${gridX},${gridY}`);
    }
    
    worldToScreen(x, y) {
        return { x, y };
    }
    
    addWall(gridX, gridY) {
        this.walls.add(`${gridX},${gridY}`);
    }
    
    removeWall(gridX, gridY) {
        this.walls.delete(`${gridX},${gridY}`);
    }
    
    // Helper method to get wrapping tunnel positions
    getWrappingTunnels() {
        const gridWidth = Math.floor(this.mazeWidth / this.cellSize);
        const gridHeight = Math.floor(this.mazeHeight / this.cellSize);
        const midX = Math.floor(gridWidth / 2);
        const midY = Math.floor(gridHeight / 2);
        
        return {
            horizontal: {
                y: midY * this.cellSize + this.cellSize / 2,
                leftX: this.cellSize / 2,
                rightX: this.mazeWidth - this.cellSize / 2
            },
            vertical: {
                x: midX * this.cellSize + this.cellSize / 2,
                topY: this.cellSize / 2,
                bottomY: this.mazeHeight - this.cellSize / 2
            }
        };
    }
}

describe('Edge Wrapping Functionality', () => {
    let player;
    let mockMazeRenderer;
    let wrappingTunnels;
    
    beforeEach(() => {
        mockMazeRenderer = new EdgeWrappingMockMazeRenderer();
        wrappingTunnels = mockMazeRenderer.getWrappingTunnels();
        player = new Player(100, 100, mockMazeRenderer);
    });
    
    describe('Horizontal Wrapping', () => {
        test('should wrap from left edge to right edge in tunnel', () => {
            // Position player at left edge in wrapping tunnel
            player.setPosition(mockMazeRenderer.cellSize / 4, wrappingTunnels.horizontal.y);
            
            player.handleEdgeWrapping();
            
            expect(player.x).toBeCloseTo(wrappingTunnels.horizontal.rightX, 1);
            expect(player.y).toBe(wrappingTunnels.horizontal.y);
        });
        
        test('should wrap from right edge to left edge in tunnel', () => {
            // Position player at right edge in wrapping tunnel
            player.setPosition(mockMazeRenderer.mazeWidth - mockMazeRenderer.cellSize / 4, wrappingTunnels.horizontal.y);
            
            player.handleEdgeWrapping();
            
            expect(player.x).toBeCloseTo(wrappingTunnels.horizontal.leftX, 1);
            expect(player.y).toBe(wrappingTunnels.horizontal.y);
        });
        
        test('should not wrap horizontally when not in tunnel area', () => {
            // Position player at left edge but not in tunnel
            const nonTunnelY = wrappingTunnels.horizontal.y + 50;
            const initialX = mockMazeRenderer.cellSize / 4;
            player.setPosition(initialX, nonTunnelY);
            
            player.handleEdgeWrapping();
            
            // Should not wrap because there's no tunnel
            expect(player.x).toBe(initialX);
            expect(player.y).toBe(nonTunnelY);
        });
        
        test('should handle smooth horizontal wrapping during movement', () => {
            // Position player moving left towards wrapping point
            player.setPosition(wrappingTunnels.horizontal.leftX + 5, wrappingTunnels.horizontal.y);
            player.setDirection('left');
            
            // Move player to trigger wrapping
            for (let i = 0; i < 10; i++) {
                player.update(16);
            }
            
            // Player should have wrapped to right side
            expect(player.x).toBeGreaterThan(mockMazeRenderer.mazeWidth / 2);
        });
    });
    
    describe('Vertical Wrapping', () => {
        test('should wrap from top edge to bottom edge in tunnel', () => {
            // Position player at top edge in wrapping tunnel
            player.setPosition(wrappingTunnels.vertical.x, mockMazeRenderer.cellSize / 4);
            
            player.handleEdgeWrapping();
            
            expect(player.x).toBe(wrappingTunnels.vertical.x);
            expect(player.y).toBeCloseTo(wrappingTunnels.vertical.bottomY, 1);
        });
        
        test('should wrap from bottom edge to top edge in tunnel', () => {
            // Position player at bottom edge in wrapping tunnel
            player.setPosition(wrappingTunnels.vertical.x, mockMazeRenderer.mazeHeight - mockMazeRenderer.cellSize / 4);
            
            player.handleEdgeWrapping();
            
            expect(player.x).toBe(wrappingTunnels.vertical.x);
            expect(player.y).toBeCloseTo(wrappingTunnels.vertical.topY, 1);
        });
        
        test('should not wrap vertically when not in tunnel area', () => {
            // Position player at top edge but not in tunnel
            const nonTunnelX = wrappingTunnels.vertical.x + 50;
            const initialY = mockMazeRenderer.cellSize / 4;
            player.setPosition(nonTunnelX, initialY);
            
            player.handleEdgeWrapping();
            
            // Should not wrap because there's no tunnel
            expect(player.x).toBe(nonTunnelX);
            expect(player.y).toBe(initialY);
        });
        
        test('should handle smooth vertical wrapping during movement', () => {
            // Position player moving up towards wrapping point
            player.setPosition(wrappingTunnels.vertical.x, wrappingTunnels.vertical.topY + 5);
            player.setDirection('up');
            
            // Move player to trigger wrapping
            for (let i = 0; i < 10; i++) {
                player.update(16);
            }
            
            // Player should have wrapped to bottom side
            expect(player.y).toBeGreaterThan(mockMazeRenderer.mazeHeight / 2);
        });
    });
    
    describe('Edge Cases', () => {
        test('should not wrap when destination has walls', () => {
            // Block the right tunnel
            const rightTunnelGridX = Math.floor(wrappingTunnels.horizontal.rightX / mockMazeRenderer.cellSize);
            const tunnelGridY = Math.floor(wrappingTunnels.horizontal.y / mockMazeRenderer.cellSize);
            mockMazeRenderer.addWall(rightTunnelGridX, tunnelGridY);
            
            const initialX = mockMazeRenderer.cellSize / 4;
            player.setPosition(initialX, wrappingTunnels.horizontal.y);
            
            player.handleEdgeWrapping();
            
            // Should not wrap due to blocked destination
            expect(player.x).toBe(initialX);
        });
        
        test('should handle wrapping with different player sizes', () => {
            // Test with larger player
            const largePlayer = new Player(100, 100, mockMazeRenderer);
            largePlayer.size = 32; // Larger size
            
            largePlayer.setPosition(mockMazeRenderer.cellSize / 4, wrappingTunnels.horizontal.y);
            largePlayer.handleEdgeWrapping();
            
            // Should still wrap correctly
            expect(largePlayer.x).toBeCloseTo(wrappingTunnels.horizontal.rightX, 1);
        });
        
        test('should handle corner wrapping scenarios', () => {
            // Position player at corner where both horizontal and vertical wrapping could occur
            // Use the actual tunnel positions to ensure wrapping is possible
            player.setPosition(mockMazeRenderer.cellSize / 4, wrappingTunnels.horizontal.y);
            
            const initialX = player.x;
            const initialY = player.y;
            
            player.handleEdgeWrapping();
            
            // Should wrap horizontally (prioritized in corner scenarios)
            expect(player.x).toBeCloseTo(wrappingTunnels.horizontal.rightX, 1);
            expect(player.y).toBe(initialY); // Y should remain the same
        });
        
        test('should maintain player direction after wrapping', () => {
            player.setPosition(wrappingTunnels.horizontal.leftX + 2, wrappingTunnels.horizontal.y);
            player.setDirection('left');
            
            const originalDirection = player.getDirection();
            
            // Move to trigger wrapping
            for (let i = 0; i < 5; i++) {
                player.update(16);
            }
            
            // Direction should be maintained after wrapping
            expect(player.getDirection()).toEqual(originalDirection);
        });
        
        test('should handle rapid wrapping (back and forth)', () => {
            // Start at left edge
            player.setPosition(wrappingTunnels.horizontal.leftX, wrappingTunnels.horizontal.y);
            player.setDirection('left');
            
            // Move left to wrap to right
            player.update(16);
            expect(player.x).toBeGreaterThan(mockMazeRenderer.mazeWidth / 2);
            
            // Change direction to right and wrap back
            player.setDirection('right');
            for (let i = 0; i < 10; i++) {
                player.update(16);
            }
            
            // Should be back on left side
            expect(player.x).toBeLessThan(mockMazeRenderer.mazeWidth / 2);
        });
        
        test('should handle wrapping with zero speed', () => {
            player.setSpeed(0);
            player.setPosition(mockMazeRenderer.cellSize / 4, wrappingTunnels.horizontal.y);
            
            player.handleEdgeWrapping();
            
            // Should still wrap even with zero speed
            expect(player.x).toBeCloseTo(wrappingTunnels.horizontal.rightX, 1);
        });
        
        test('should handle wrapping at exact edge boundaries', () => {
            // Test exact boundary conditions
            const exactLeftEdge = mockMazeRenderer.cellSize / 2;
            const exactRightEdge = mockMazeRenderer.mazeWidth - mockMazeRenderer.cellSize / 2;
            
            // Test left boundary
            player.setPosition(exactLeftEdge, wrappingTunnels.horizontal.y);
            player.handleEdgeWrapping();
            expect(player.x).toBe(exactLeftEdge); // Should not wrap at exact boundary
            
            // Test right boundary
            player.setPosition(exactRightEdge, wrappingTunnels.horizontal.y);
            player.handleEdgeWrapping();
            expect(player.x).toBe(exactRightEdge); // Should not wrap at exact boundary
        });
    });
    
    describe('Integration with Movement', () => {
        test('should wrap seamlessly during continuous movement', () => {
            // Start player moving left towards wrap point
            player.setPosition(wrappingTunnels.horizontal.leftX + 10, wrappingTunnels.horizontal.y);
            player.setDirection('left');
            
            const positions = [];
            
            // Record positions during movement
            for (let i = 0; i < 20; i++) {
                player.update(16);
                positions.push({ x: player.x, y: player.y });
            }
            
            // Verify smooth transition (no sudden jumps except for wrapping)
            let wrappingOccurred = false;
            for (let i = 1; i < positions.length; i++) {
                const deltaX = Math.abs(positions[i].x - positions[i-1].x);
                if (deltaX > mockMazeRenderer.mazeWidth / 2) {
                    wrappingOccurred = true;
                }
            }
            
            expect(wrappingOccurred).toBe(true);
        });
        
        test('should handle wrapping with collision detection', () => {
            // Add wall immediately to the left of the right tunnel exit
            const rightTunnelGridX = Math.floor(wrappingTunnels.horizontal.rightX / mockMazeRenderer.cellSize);
            const tunnelGridY = Math.floor(wrappingTunnels.horizontal.y / mockMazeRenderer.cellSize);
            mockMazeRenderer.addWall(rightTunnelGridX - 1, tunnelGridY);
            
            player.setPosition(wrappingTunnels.horizontal.leftX + 5, wrappingTunnels.horizontal.y);
            player.setDirection('left');
            
            // Move to trigger wrapping
            let moveCount = 0;
            while (moveCount < 20 && player.getDirection().x !== 0) {
                player.update(16);
                moveCount++;
            }
            
            // Player should wrap and then stop due to wall blocking further movement
            expect(player.x).toBeGreaterThan(mockMazeRenderer.mazeWidth / 2);
            expect(player.getDirection()).toEqual({ x: 0, y: 0 }); // Should stop due to collision
        });
    });
});