# BoxerConnect - Makefile
# Convenience commands for development and deployment

.PHONY: help dev build deploy backup clean test

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo 'BoxerConnect - Available Commands:'
	@echo ''
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ''

# =============================================================================
# Development
# =============================================================================

dev: ## Start local development environment
	@echo "Starting local development environment..."
	docker-compose up -d
	@echo "Development environment started!"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"

dev-down: ## Stop local development environment
	@echo "Stopping local development environment..."
	docker-compose down
	@echo "Development environment stopped!"

dev-logs: ## Show logs from development containers
	docker-compose logs -f

# =============================================================================
# Production Build
# =============================================================================

build: ## Build production Docker images
	@echo "Building production Docker images..."
	docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "Build complete!"

build-backend: ## Build only backend image
	@echo "Building backend image..."
	docker build -t boxerconnect-backend:latest ./backend
	@echo "Backend build complete!"

build-frontend: ## Build only frontend image
	@echo "Building frontend image..."
	docker build -t boxerconnect-frontend:latest ./frontend
	@echo "Frontend build complete!"

# =============================================================================
# Production Deployment
# =============================================================================

deploy: ## Deploy to production (Raspberry Pi)
	@echo "Deploying to production..."
	./scripts/deployment/deploy.sh

setup-pi: ## Initial Raspberry Pi setup
	@echo "Running Raspberry Pi setup..."
	./scripts/deployment/setup-pi.sh

# =============================================================================
# Database Operations
# =============================================================================

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	cd backend && npx prisma migrate deploy
	@echo "Migrations complete!"

db-migrate-dev: ## Create and run new migration (development)
	@echo "Creating new migration..."
	cd backend && npx prisma migrate dev

db-reset: ## Reset database (WARNING: Deletes all data!)
	@echo "Resetting database..."
	cd backend && npx prisma migrate reset
	@echo "Database reset complete!"

db-studio: ## Open Prisma Studio (database GUI)
	@echo "Opening Prisma Studio..."
	cd backend && npx prisma studio

db-seed: ## Seed database with initial data
	@echo "Seeding database..."
	cd backend && npm run prisma:seed
	@echo "Database seeded!"

# =============================================================================
# Backup and Restore
# =============================================================================

backup: ## Create backup of production data
	@echo "Creating backup..."
	./scripts/deployment/backup.sh

# =============================================================================
# Testing
# =============================================================================

test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test

test-backend: ## Run backend tests only
	@echo "Running backend tests..."
	cd backend && npm test

test-frontend: ## Run frontend tests only
	@echo "Running frontend tests..."
	cd frontend && npm test

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	cd backend && npm run test -- --coverage
	cd frontend && npm run test:coverage

# =============================================================================
# Code Quality
# =============================================================================

lint: ## Run linters
	@echo "Linting backend..."
	cd backend && npm run lint
	@echo "Linting frontend..."
	cd frontend && npm run lint

lint-fix: ## Fix linting issues automatically
	@echo "Fixing backend linting issues..."
	cd backend && npm run lint -- --fix
	@echo "Fixing frontend linting issues..."
	cd frontend && npm run lint -- --fix

# =============================================================================
# Production Management
# =============================================================================

prod-up: ## Start production containers
	@echo "Starting production containers..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production containers started!"

prod-down: ## Stop production containers
	@echo "Stopping production containers..."
	docker-compose -f docker-compose.prod.yml down
	@echo "Production containers stopped!"

prod-logs: ## Show production container logs
	docker-compose -f docker-compose.prod.yml logs -f

prod-status: ## Show production container status
	@echo "Production container status:"
	docker-compose -f docker-compose.prod.yml ps

prod-restart: ## Restart production containers
	@echo "Restarting production containers..."
	docker-compose -f docker-compose.prod.yml restart
	@echo "Production containers restarted!"

# =============================================================================
# Health Checks
# =============================================================================

health: ## Check health of production services
	@echo "Checking service health..."
	@curl -f http://localhost:3001/health && echo "✓ Backend is healthy" || echo "✗ Backend is unhealthy"
	@curl -f http://localhost:8080/health && echo "✓ Frontend is healthy" || echo "✗ Frontend is unhealthy"

# =============================================================================
# Cleanup
# =============================================================================

clean: ## Clean up Docker resources
	@echo "Cleaning up Docker resources..."
	docker system prune -f
	@echo "Cleanup complete!"

clean-all: ## Clean up all Docker resources (including volumes)
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose -f docker-compose.prod.yml down -v; \
		docker system prune -af --volumes; \
		echo "All Docker resources cleaned!"; \
	fi

# =============================================================================
# Secrets Generation
# =============================================================================

generate-secrets: ## Generate secure secrets for production
	@echo "Generated Secrets (add these to .env.production):"
	@echo ""
	@echo "JWT_SECRET=$$(openssl rand -base64 64 | tr -d '\n')"
	@echo ""
	@echo "JWT_REFRESH_SECRET=$$(openssl rand -base64 64 | tr -d '\n')"
	@echo ""
	@echo "DB_PASSWORD=$$(openssl rand -base64 32 | tr -d '\n')"
	@echo ""
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 32 | tr -d '\n')"
	@echo ""

# =============================================================================
# Security
# =============================================================================

security-scan: ## Run security vulnerability scan
	@echo "Scanning for security vulnerabilities..."
	cd backend && npm audit
	cd frontend && npm audit

security-fix: ## Fix security vulnerabilities automatically
	@echo "Fixing security vulnerabilities..."
	cd backend && npm audit fix
	cd frontend && npm audit fix
