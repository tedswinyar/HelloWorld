export class InputHandler {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.keys = {};
        
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
        // Prioritize most recent input by checking combinations
        if (up && !down) {
            this.gameEngine.handleInput('up');
        } else if (down && !up) {
            this.gameEngine.handleInput('down');
        } else if (left && !right) {
            this.gameEngine.handleInput('left');
        } else if (right && !left) {
            this.gameEngine.handleInput('right');
        } else {
            // No movement keys pressed or conflicting keys
            this.gameEngine.handleInput('stop');
        }
    }
    
    // Clean up event listeners
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
}