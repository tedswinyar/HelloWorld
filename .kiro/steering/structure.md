# Project Structure

## Directory Organization

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
│   │   ├── connectionHandler.js
│   │   ├── gameStateManager.js
│   │   └── genreModeController.js
│   ├── models/             # Data models
│   ├── utils/              # Server utilities
│   └── tests/              # Server-side tests
├── infrastructure/         # AWS infrastructure as code
│   ├── cloudformation/     # CloudFormation templates
│   └── scripts/            # Deployment scripts
├── tests/                  # Client-side tests
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
└── docs/                   # Documentation
```

## File Naming Conventions

- **JavaScript files**: PascalCase for classes (`GameEngine.js`), camelCase for utilities (`gameUtils.js`)
- **CSS files**: kebab-case (`game-styles.css`)
- **HTML files**: lowercase (`index.html`)
- **Test files**: `*.test.js` or `*.spec.js`

## Code Organization Principles

- **Component-based architecture** - Each game component is a separate module
- **Separation of concerns** - Client, server, and infrastructure code in separate directories
- **Modular design** - Small, focused modules with clear responsibilities
- **Test co-location** - Tests organized by functionality, not file type

## Key Architectural Patterns

- **MVC pattern** - Model (game state), View (canvas rendering), Controller (input handling)
- **Observer pattern** - Event-driven communication between game components
- **State machine** - Game modes and states managed through clear state transitions
- **Factory pattern** - Enemy and mode creation through factory functions

## Import/Export Standards

- Use ES6 modules (`import`/`export`)
- Prefer named exports for utilities, default exports for main classes
- Group imports: external libraries first, then internal modules
- Use relative paths for local imports, absolute for external dependencies