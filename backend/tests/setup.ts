// Jest Test Setup
// Configures the test environment before running tests

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3002';
process.env['HOST'] = 'localhost';
process.env['DATABASE_URL'] = 'postgresql://boxer:boxer_dev_password@localhost:5432/boxerconnect_test?schema=public';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';
process.env['JWT_SECRET'] = 'test-jwt-secret-key-that-is-at-least-32-characters';
process.env['JWT_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-that-is-at-least-32-characters';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['RATE_LIMIT_MAX_REQUESTS'] = '1000';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
process.env['LOG_LEVEL'] = 'error';

// Increase Jest timeout for integration tests
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  // Add any global setup here
  console.log('Starting test suite...');
});

// Global teardown
afterAll(async () => {
  // Add any global cleanup here
  console.log('Test suite complete.');
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
