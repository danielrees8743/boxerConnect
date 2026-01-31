# BoxerConnect Development Guide

This guide covers everything you need to know to develop and contribute to BoxerConnect.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Docker Commands](#docker-commands)
- [Running Tests](#running-tests)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Debugging Tips](#debugging-tips)
- [Common Issues](#common-issues)

---

## Local Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Initial Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd BoxerConnect
```

#### 2. Start Infrastructure Services

Start PostgreSQL and Redis containers:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS
boxerconnect-postgres   Up (healthy)
boxerconnect-redis      Up (healthy)
```

#### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

DATABASE_URL=postgresql://boxer:boxer_dev_password@localhost:5432/boxerconnect
REDIS_URL=redis://localhost:6379

JWT_SECRET=development-jwt-secret-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=development-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=debug
```

Generate Prisma client and run migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed with test data
npm run prisma:seed
```

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

#### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file (if needed)
echo "VITE_API_URL=http://localhost:3001/api/v1" > .env
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Verify Setup

Test the API health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"success":true,"data":{"status":"ok"},"message":"Service is healthy"}
```

---

## Docker Commands

### Basic Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis

# Restart a service
docker-compose restart postgres

# Check service status
docker-compose ps
```

### Database Commands

```bash
# Connect to PostgreSQL
docker exec -it boxerconnect-postgres psql -U boxer -d boxerconnect

# Execute SQL file
docker exec -i boxerconnect-postgres psql -U boxer -d boxerconnect < script.sql

# Create database backup
docker exec boxerconnect-postgres pg_dump -U boxer boxerconnect > backup.sql

# Restore from backup
docker exec -i boxerconnect-postgres psql -U boxer boxerconnect < backup.sql
```

### Redis Commands

```bash
# Connect to Redis CLI
docker exec -it boxerconnect-redis redis-cli

# Monitor Redis commands
docker exec -it boxerconnect-redis redis-cli monitor

# Clear all Redis data
docker exec -it boxerconnect-redis redis-cli FLUSHALL
```

### Cleanup

```bash
# Remove all containers and volumes (WARNING: destroys data)
docker-compose down -v

# Remove unused Docker resources
docker system prune -a
```

---

## Running Tests

### Backend Tests

The backend uses **Jest** for testing.

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Generate coverage report
npm test -- --coverage
```

#### Test Structure

```
backend/
└── tests/
    ├── setup.ts           # Test configuration
    ├── unit/              # Unit tests
    │   ├── services/
    │   └── utils/
    ├── integration/       # Integration tests
    │   ├── auth.test.ts
    │   └── boxer.test.ts
    └── fixtures/          # Test data
```

#### Writing Tests

```typescript
// Example test file: tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Frontend Tests

The frontend uses **Vitest** with **React Testing Library**.

```bash
cd frontend

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.tsx
```

#### Test Structure

```
frontend/
└── tests/
    ├── setup.ts           # Test configuration
    └── components/        # Component tests
```

#### Writing Component Tests

```typescript
// Example test: tests/components/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../src/app/store';
import LoginForm from '../../src/components/LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

---

## Code Style Guidelines

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` when type is truly unknown

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

function getUserById(id: string): Promise<User | null> {
  // ...
}

// Avoid
type User = {
  id: any;
  email: any;
  name: any;
};

function getUserById(id) {
  // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `isActive` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_URL` |
| Functions | camelCase | `getUserById`, `validateEmail` |
| Classes | PascalCase | `UserService`, `AuthController` |
| Interfaces | PascalCase | `User`, `ApiResponse` |
| Types | PascalCase | `UserRole`, `RequestParams` |
| Files | kebab-case or camelCase | `auth.service.ts`, `userController.ts` |
| React Components | PascalCase | `LoginForm.tsx`, `UserProfile.tsx` |

### Backend Code Style

```typescript
// Service example
export async function createUser(data: CreateUserInput): Promise<User> {
  // Validate input
  const validated = createUserSchema.parse(data);

  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email: validated.email,
      passwordHash: await hashPassword(validated.password),
      name: validated.name,
    },
  });

  return user;
}
```

### Frontend Code Style

```typescript
// Component example
import { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui/button';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await dispatch(login(data)).unwrap();
      onSuccess?.();
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

### ESLint

Both frontend and backend have ESLint configured. Run linting:

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

---

## Git Workflow

### Branch Naming Convention

```
<type>/<short-description>

Examples:
feat/user-authentication
fix/login-redirect-bug
refactor/api-response-format
docs/api-documentation
test/auth-integration-tests
chore/update-dependencies
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

**Examples:**

```bash
# Feature
git commit -m "feat(auth): add OAuth2 Google authentication"

# Bug fix
git commit -m "fix(api): resolve race condition in user creation"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactoring
git commit -m "refactor(services): extract validation logic to separate module"
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature
   ```

2. **Make changes and commit**
   ```bash
   git add src/services/auth.service.ts
   git commit -m "feat(auth): implement password reset flow"
   ```

3. **Keep branch updated**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push and create PR**
   ```bash
   git push origin feat/your-feature
   ```

5. **After PR approval, merge**
   ```bash
   # Usually done via GitHub UI
   ```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linting passes
- [ ] No console.log statements (unless intentional)
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated if needed

---

## Debugging Tips

### Backend Debugging

#### VS Code Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/server.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

#### Logging

Use the LOG_LEVEL environment variable:

```env
LOG_LEVEL=debug  # Show all logs
LOG_LEVEL=info   # Default
LOG_LEVEL=error  # Errors only
```

#### Database Queries

View SQL queries generated by Prisma:

```typescript
// In development, add to prisma client initialization
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Frontend Debugging

#### React Developer Tools

Install the [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.

#### Redux DevTools

Install [Redux DevTools](https://github.com/reduxjs/redux-devtools) browser extension to inspect state changes.

#### Network Inspection

Use browser DevTools Network tab to inspect API requests.

---

## Common Issues

### Database Connection Fails

**Error:** `Connection refused` or `ECONNREFUSED`

**Solution:**
1. Check if Docker containers are running: `docker-compose ps`
2. Verify DATABASE_URL in `.env` matches docker-compose.yml settings
3. Wait for PostgreSQL to be fully ready (health check should pass)

### Prisma Client Not Generated

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npm run prisma:generate
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3002
```

### Redis Connection Issues

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Solution:**
1. Check Redis container: `docker-compose ps`
2. Verify REDIS_URL in `.env`
3. Restart Redis: `docker-compose restart redis`

### TypeScript Compilation Errors

**Error:** Type errors during build

**Solution:**
```bash
# Clear TypeScript cache
rm -rf dist/
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Migration Conflicts

**Error:** Migration failed or conflicts

**Solution:**
```bash
# Reset database (development only!)
npm run db:reset

# Or resolve manually
npm run prisma:migrate -- --create-only
# Fix migration file
npm run prisma:migrate
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
