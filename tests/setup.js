// Jest setup file for global test configuration

// Mock requestAnimationFrame for all tests
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock performance.now for consistent timing in tests
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};