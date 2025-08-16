export class InputHandler {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.keys = {};
        this.lastDirection = null; // Track last sent direction to avoid duplicates
        
        // Bind event listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        console.log('Input handler initialized');
    }
    
    handleKeyDown(event) {
        // Prevent default behavior for game keys
        if (this.isGameKey(event.code)) {
            event.preventDefault();
        }
        
        this.keys[event.code] = true;
        this.updatePlayerDirection();
    }
    
    handleKeyUp(event) {
        this.keys[event.code] = false;
        this.updatePlayerDirection();
    }
    
    isGameKey(keyCode) {
        const gameKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyW', 'KeyA', 'KeyS', 'KeyD'
        ];
        return gameKeys.includes(keyCode);
    }
    
    updatePlayerDirection() {
        // Check for arrow keys and WASD
        const up = this.keys['ArrowUp'] || this.keys['KeyW'];
        const down = this.keys['ArrowDown'] || this.keys['KeyS'];
        const left = this.keys['ArrowLeft'] || this.keys['KeyA'];
        const right = this.keys['ArrowRight'] || this.keys['KeyD'];
        
        // Determine direction based on pressed keys
        // Only change direction when a key is pressed, don't stop on key release
        // This creates continuous movement like classic Pac-Man
        let newDirection = null;
        
        if (up && !down) {
            newDirection = 'up';
        } else if (down && !up) {
            newDirection = 'down';
        } else if (left && !right) {
            newDirection = 'left';
        } else if (right && !left) {
            newDirection = 'right';
        }
        
        // Only send direction command if it's different from the last one
        if (newDirection && newDirection !== this.lastDirection) {
            this.gameEngine.handleInput(newDirection);
            this.lastDirection = newDirection;
        }
        
        // Reset lastDirection when no keys are pressed to allow re-pressing same key
        if (!up && !down && !left && !right) {
            this.lastDirection = null;
        }
    }
    
    // Clean up event listeners
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
}