# Technology Stack

## Frontend Technologies

- **HTML5 Canvas** - Game rendering and graphics
- **Vanilla JavaScript** - Game logic and client-side functionality
- **WebSocket API** - Real-time multiplayer communication
- **CSS3** - UI styling and responsive design

## Backend Technologies

- **AWS Lambda** - Serverless compute for game logic
- **API Gateway WebSocket** - Managed WebSocket connections
- **DynamoDB** - NoSQL database for game state and player data
- **SQS** - Message queuing for genre-breaking mode coordination
- **CloudWatch Events** - Scheduled triggers for game modes

## Hosting & CDN

- **S3** - Static website hosting
- **CloudFront** - Global CDN for asset delivery

## Development Tools

- **Jest** - Unit and integration testing
- **Node.js** - Development environment and build tools

## Common Commands

### Development
```bash
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

## Architecture Principles

- **Serverless-first** - Use AWS Lambda and managed services to minimize operational overhead
- **Cost optimization** - Pay-per-use pricing models, auto-scaling based on demand
- **Simplicity** - Prefer straightforward solutions over complex architectures
- **Browser compatibility** - Support modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)