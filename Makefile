.PHONY: help test test-cov test-watch build up down restart logs logs-f clean install shell db-shell migrate migrate-auto migrate-downgrade health status

# Default target
.DEFAULT_GOAL := help

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_EXEC = $(DOCKER_COMPOSE) exec weather-service
PYTEST = pytest
PYTHON = python3

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Testing
test: ## Run all tests
	$(PYTEST)

test-cov: ## Run tests with coverage report
	$(PYTEST) --cov=src --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode (requires pytest-watch)
	$(PYTEST) -f

test-verbose: ## Run tests with verbose output
	$(PYTEST) -vv

# Docker Operations
build: ## Build Docker containers
	$(DOCKER_COMPOSE) build

build-no-cache: ## Build Docker containers without cache
	$(DOCKER_COMPOSE) build --no-cache

up: ## Start containers in detached mode
	$(DOCKER_COMPOSE) up -d

up-build: ## Build and start containers
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop and remove containers
	$(DOCKER_COMPOSE) down

restart: ## Restart containers
	$(DOCKER_COMPOSE) restart

stop: ## Stop containers without removing
	$(DOCKER_COMPOSE) stop

start: ## Start existing containers
	$(DOCKER_COMPOSE) start

# Logs
logs: ## Show container logs (last 100 lines)
	$(DOCKER_COMPOSE) logs --tail=100

logs-f: ## Follow container logs
	$(DOCKER_COMPOSE) logs -f

logs-app: ## Show application logs only
	$(DOCKER_COMPOSE) logs --tail=100 weather-service

logs-app-f: ## Follow application logs
	$(DOCKER_COMPOSE) logs -f weather-service

# Development
shell: ## Open a shell in the running container
	$(DOCKER_EXEC) /bin/bash

shell-root: ## Open a root shell in the running container
	$(DOCKER_COMPOSE) exec -u root weather-service /bin/bash

db-shell: ## Open PostgreSQL shell
	$(DOCKER_EXEC) psql $(DATABASE_URL)

# Database Migrations
migrate: ## Run database migrations
	$(DOCKER_EXEC) alembic upgrade head

migrate-downgrade: ## Downgrade database by one revision
	$(DOCKER_EXEC) alembic downgrade -1

migrate-auto: ## Auto-generate a new migration
	@read -p "Enter migration message: " msg; \
	$(DOCKER_EXEC) alembic revision --autogenerate -m "$$msg"

migrate-history: ## Show migration history
	$(DOCKER_EXEC) alembic history

migrate-current: ## Show current migration version
	$(DOCKER_EXEC) alembic current

# Local Development (without Docker)
install: ## Install Python dependencies locally
	pip install -r requirements.txt

run-local: ## Run the application locally (not in Docker)
	uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Health & Status
health: ## Check application health
	curl -f http://localhost:7000/api/health || echo "Health check failed"

status: ## Show container status
	$(DOCKER_COMPOSE) ps

# Cleanup
clean: ## Remove containers, volumes, and build artifacts
	$(DOCKER_COMPOSE) down -v
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	rm -rf htmlcov/ .coverage

clean-all: clean ## Remove everything including Docker images
	$(DOCKER_COMPOSE) down -v --rmi all

# Utility
ps: ## Show running containers
	docker ps -a | grep wx-service || echo "No wx-service container found"

rebuild: ## Complete rebuild (down, clean, build, up)
	make down
	make clean
	make build
	make up
	@echo "Waiting for service to be ready..."
	@sleep 5
	make health

dev: ## Quick start for development (build and up)
	make up-build
	make logs-f

# Linting & Formatting (add if you use these tools)
lint: ## Run linting (requires flake8 or ruff)
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check src tests; \
	elif command -v flake8 >/dev/null 2>&1; then \
		flake8 src tests; \
	else \
		echo "No linter found. Install ruff or flake8."; \
	fi

format: ## Format code (requires black or ruff)
	@if command -v ruff >/dev/null 2>&1; then \
		ruff format src tests; \
	elif command -v black >/dev/null 2>&1; then \
		black src tests; \
	else \
		echo "No formatter found. Install ruff or black."; \
	fi
