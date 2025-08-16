export class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isRunning = false;
        this.lastTime = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        
        // Game state
        this.gameState = {
            score: 0,
            lives: 3,
            level: 1
        };
        
        // Player position (temporary for basic setup)
        this.player = {
            x: 50,
            y: 50,
            size: 20,
            speed: 2,
            direction: { x: 0, y: 0 }
        };
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
            console.log('Game started');
        }
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game stopped');
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameInterval) {
            this.update(deltaTime);
            this.render();
            this.lastTime = currentTime - (deltaTime % this.frameInterval);
        }
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // Update player position based on input
        this.player.x += this.player.direction.x * this.player.speed;
        this.player.y += this.player.direction.y * this.player.speed;
        
        // Basic boundary checking (temporary)
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.x > this.canvas.width - this.player.size) {
            this.player.x = this.canvas.width - this.player.size;
        }
        if (this.player.y > this.canvas.height - this.player.size) {
            this.player.y = this.canvas.height - this.player.size;
        }
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render player (simple rectangle for now)
        this.ctx.fillStyle = '#ffff00'; // Yellow like Pac-Man
        this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
    }
    
    updateUI() {
        const scoreElement = document.getElementById('score-value');
        const livesElement = document.getElementById('lives-value');
        
        if (scoreElement) scoreElement.textContent = this.gameState.score;
        if (livesElement) livesElement.textContent = this.gameState.lives;
    }
    
    // Input handling methods
    handleInput(direction) {
        switch (direction) {
            case 'up':
                this.player.direction = { x: 0, y: -1 };
                break;
            case 'down':
                this.player.direction = { x: 0, y: 1 };
                break;
            case 'left':
                this.player.direction = { x: -1, y: 0 };
                break;
            case 'right':
                this.player.direction = { x: 1, y: 0 };
                break;
            case 'stop':
                this.player.direction = { x: 0, y: 0 };
                break;
        }
    }
    
    // Game state methods
    updateScore(points) {
        this.gameState.score += points;
    }
    
    loseLife() {
        this.gameState.lives--;
        if (this.gameState.lives <= 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.stop();
        console.log('Game Over! Final Score:', this.gameState.score);
        // TODO: Implement proper game over screen
    }
}