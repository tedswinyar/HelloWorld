import { GameEngine } from './components/GameEngine.js';
import { InputHandler } from './utils/InputHandler.js';

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Create game engine instance
    const gameEngine = new GameEngine(canvas, ctx);
    
    // Create input handler
    const inputHandler = new InputHandler(gameEngine);
    
    // Start the game
    gameEngine.start();
    
    console.log('Maze Runner Game initialized');
});