# Maze Runner Game

A browser-based multiplayer maze runner game that combines classic Pac-Man mechanics with modern multiplayer features and innovative genre-breaking modes.

## Learning Objectives

This project serves as a comprehensive learning exercise for **spec-driven development using Kiro**, demonstrating how to:

- Transform a rough feature idea into detailed requirements using EARS format
- Create comprehensive design documents with architecture and component specifications
- Break down complex features into actionable implementation tasks
- Use Kiro's spec workflow to systematically develop features from concept to completion
- Apply iterative development practices with clear documentation and task tracking

The project follows Kiro's spec-driven methodology, moving through requirements gathering, design documentation, and task-based implementation to showcase best practices for structured software development.

### Spec-Driven Development Workflow

1. **Requirements Phase** - Define user stories and acceptance criteria in EARS format
2. **Design Phase** - Create detailed technical design with architecture and data models  
3. **Task Planning** - Break design into discrete, testable implementation tasks
4. **Implementation** - Execute tasks incrementally with continuous testing and validation

All specification documents are available in [`.kiro/specs/maze-runner-game/`](.kiro/specs/maze-runner-game/) for reference and learning.

## Features

- **Single-player and multiplayer modes** - Play solo against AI or compete with other players online
- **Random maze generation** - Each game features a unique maze layout for replay value
- **Genre-breaking modes** - Periodic gameplay variations (Speed Mode, Ghost Mode, Darkness Mode, etc.) that temporarily change game mechanics
- **Real-time multiplayer** - WebSocket-based multiplayer with room creation and joining
- **Cross-platform browser support** - Works on desktop and mobile browsers without installation

## Technology Stack

### Frontend
- **HTML5 Canvas** - Game rendering and graphics
- **Vanilla JavaScript** - Game logic and client-side functionality
- **WebSocket API** - Real-time multiplayer communication
- **CSS3** - UI styling and responsive design

### Backend (AWS Serverless)
- **AWS Lambda** - Serverless compute for game logic
- **API Gateway WebSocket** - Managed WebSocket connections
- **DynamoDB** - NoSQL database for game state and player data
- **SQS** - Message queuing for genre-breaking mode coordination
- **CloudWatch Events** - Scheduled triggers for game modes

### Hosting & CDN
- **S3** - Static website hosting
- **CloudFront** - Global CDN for asset delivery

## Project Structure

```
/
├── client/                 # Frontend game client
│   ├── src/
│   │   ├── components/     # Game components
│   │   │   ├── GameEngine.js
│   │   │   ├── MazeGenerator.js
│   │   │   ├── Player.js
│   │   │   ├── Enemy.js
│   │   │   └── AIController.js
│   │   ├── multiplayer/    # Multiplayer functionality
│   │   │   └── MultiplayerClient.js
│   │   ├── modes/          # Genre-breaking modes
│   │   ├── utils/          # Utility functions
│   │   └── main.js         # Entry point
│   ├── assets/             # Game assets (images, sounds)
│   ├── styles/             # CSS files
│   └── index.html          # Main HTML file
├── server/                 # AWS Lambda functions
│   ├── handlers/           # Lambda function handlers
│   ├── models/             # Data models
│   └── utils/              # Server utilities
├── infrastructure/         # AWS infrastructure as code
├── tests/                  # Client-side tests
└── docs/                   # Documentation
```

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start local development server
npm start

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

### Deployment

```bash
# Deploy AWS infrastructure
npm run deploy:aws

# Deploy static assets to S3
npm run deploy:client

# Full deployment
npm run deploy
```

## Game Mechanics

### Core Gameplay
- Navigate through randomly generated mazes
- Collect pellets to score points
- Avoid AI-controlled enemies
- Use power pellets for temporary advantages
- Wrap around maze edges for strategic movement

### Genre-Breaking Modes
The game features periodic mode changes that temporarily alter gameplay:

Mode | Effect | Duration
--- | --- | ---
**Speed Mode** | All characters move at double speed | 30-60s
**Ghost Mode** | Players can pass through walls | 30-60s
**Darkness Mode** | Limited visibility around player | 30-60s
**Giant Mode** | Player character becomes larger | 30-60s
**Teleport Mode** | Random teleportation events | 30-60s
**Gravity Mode** | Pellets and players affected by gravity | 30-60s

### Multiplayer Features
- Real-time multiplayer with WebSocket connections
- Room-based matchmaking
- Individual score tracking and rankings
- Synchronized genre-breaking modes across all players

## Architecture

The game uses a serverless AWS architecture optimized for cost and scalability:

- **Frontend**: Static files served via S3 and CloudFront CDN
- **Real-time Communication**: API Gateway WebSocket for low-latency multiplayer
- **Game Logic**: AWS Lambda functions for serverless compute
- **Data Storage**: DynamoDB for game state and player data
- **Mode Coordination**: SQS for managing genre-breaking mode events

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Android Chrome)

## Development Status

✅ **Task 1**: Project structure and core game foundation  
⏳ **Task 2**: Maze generation and rendering  
⏳ **Task 3**: Player character implementation  
⏳ **Task 4**: Collision detection and game mechanics  
⏳ **Task 5**: Enemy AI and pathfinding  
⏳ **Task 6**: Pellet collection and scoring  
⏳ **Task 7**: Game state management  
⏳ **Task 8**: Multiplayer WebSocket integration  
⏳ **Task 9**: Genre-breaking modes  
⏳ **Task 10**: AWS infrastructure deployment

## Contributing

This project follows component-based architecture with clear separation of concerns. See the [design document](.kiro/specs/maze-runner-game/design.md) for detailed technical specifications.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty