# BoxerConnect

A modern web platform that connects boxers with sparring partners and facilitates match coordination. BoxerConnect provides a complete ecosystem for boxers, coaches, and gym owners to find compatible training partners, manage availability, and coordinate sparring sessions.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Storage**: Supabase Storage (profile photos, videos)
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Routing**: React Router DOM v6
- **UI Components**: Radix UI, Lucide Icons

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** or **yarn**
- **Git**
- **Supabase Account** (free tier available at https://supabase.com)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BoxerConnect
```

### 2. Supabase Setup

Create and configure your Supabase project:

1. **Create a Supabase project** at https://supabase.com
2. **Create storage buckets**:
   - `boxer-photos` (public, 5MB file size limit)
   - `boxer-videos` (public, 100MB file size limit)
3. **Get your credentials** from Dashboard > Settings > API

For detailed setup instructions, see [Supabase Setup Guide](docs/SUPABASE_SETUP.md).

### 3. Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

### 4. Configure Environment Variables

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env and add your Supabase credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - Set STORAGE_PROVIDER=supabase
```

See the [Environment Variables](#environment-variables) section below for complete configuration details.

### 5. Setup Database

```bash
# Generate Prisma client and push schema to Supabase
npm run db:setup
```

### 6. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Root-Level Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend servers |
| `npm run install:all` | Install all dependencies (root, backend, frontend) |
| `npm run db:setup` | Generate Prisma client and push schema to database |

### Alternative: Step-by-Step Setup

If you prefer to set up each component manually:

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials

# Generate Prisma client
npm run prisma:generate

# Push database schema to Supabase
npm run prisma:db:push

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:3001`

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Test Accounts

After running the application, you can use these test accounts (if seeded):

| Email | Password | Description |
|-------|----------|-------------|
| `mike.tyson@test.com` | `Password123` | Professional heavyweight boxer |
| `evander.holyfield@test.com` | `Password123` | Professional heavyweight boxer |
| `lennox.lewis@test.com` | `Password123` | Professional heavyweight boxer |
| `canelo@test.com` | `Password123` | Professional middleweight boxer |
| `anthony.joshua@test.com` | `Password123` | Professional heavyweight boxer |
| `amateur.boxer@test.com` | `Password123` | Amateur heavyweight boxer |

## Project Structure

```
BoxerConnect/
├── backend/                    # Express.js API
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # Configuration (env, database, redis)
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Data models
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   ├── validators/        # Zod validation schemas
│   │   ├── app.ts             # Express app configuration
│   │   └── server.ts          # Server entry point
│   └── tests/                 # Backend tests
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── app/               # Redux store configuration
│   │   ├── components/        # Reusable UI components
│   │   ├── features/          # Feature modules (Redux slices)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility libraries
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service functions
│   │   └── types/             # TypeScript types
│   └── tests/                 # Frontend tests
│
├── docs/                       # Documentation
│   ├── API.md                 # API documentation
│   ├── DATABASE.md            # Database schema documentation
│   ├── DEVELOPMENT.md         # Development guide
│   ├── SUPABASE_SETUP.md      # Supabase setup guide
│   ├── api/                   # Endpoint-specific documentation
│   │   └── profile-photo.md   # Profile photo upload API
│   └── architecture/          # Architecture documentation
│       └── storage.md         # Storage system architecture
│
└── README.md                   # This file
```

## Available Scripts

### Backend (`/backend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production server |
| `npm test` | Run test suite with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations (dev) |
| `npm run prisma:migrate:prod` | Run database migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:seed` | Seed database with test data |
| `npm run db:reset` | Reset database and re-run migrations |

### Frontend (`/frontend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest test suite |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

## Environment Variables

### Backend

Create a `.env` file in the `/backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Supabase Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Configuration
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Authentication (use strong random secrets in production)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

**Important:** Replace the placeholder values with your actual Supabase credentials. See [Supabase Setup Guide](docs/SUPABASE_SETUP.md) for details on obtaining these values.

### Frontend

Create a `.env` file in the `/frontend` directory:

```env
VITE_API_URL=http://localhost:3001/api/v1
```

## API Overview

The BoxerConnect API follows RESTful conventions with JWT authentication.

**Base URL**: `http://localhost:3001/api/v1`

### Main Resource Endpoints

| Resource | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/auth` | Register, login, logout, token refresh |
| Boxers | `/boxers` | Boxer profiles and search |
| Profile Photos | `/boxers/me/photo` | Upload and manage profile photos |
| Match Requests | `/match-requests` | Sparring match coordination |
| Availability | `/availability` | Boxer availability management |
| Coach | `/coach` | Coach-boxer relationships |
| Admin | `/admin` | Administrative operations |

For detailed API documentation including request/response examples, see [docs/API.md](docs/API.md).

## Contributing

### Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write or update tests for your changes

4. Run the test suite:
   ```bash
   npm test
   ```

5. Run linting:
   ```bash
   npm run lint
   ```

6. Commit your changes using conventional commits:
   ```bash
   git commit -m "feat(scope): add new feature"
   ```

7. Push your branch and create a pull request

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope):` - New feature
- `fix(scope):` - Bug fix
- `docs(scope):` - Documentation changes
- `refactor(scope):` - Code refactoring
- `test(scope):` - Test additions/changes
- `chore(scope):` - Maintenance tasks

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (if configured)
- Meaningful variable and function names
- JSDoc comments for public APIs

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

For more detailed documentation:
- [Supabase Setup Guide](docs/SUPABASE_SETUP.md) - Complete Supabase configuration guide
- [API Documentation](docs/API.md)
- [Profile Photo API](docs/api/profile-photo.md)
- [Database Schema](docs/DATABASE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Storage Architecture](docs/architecture/storage.md)
- [Migration Scripts](backend/scripts/README.md) - Database and file migration tools
