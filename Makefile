.PHONY: dev format lint install-deps clean

# Development - start both frontend and backend
dev:
	@echo "Starting development servers..."
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@cd backend && poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000 & \
	cd frontend && npm run dev -- --host 0.0.0.0 --port 5173 & \
	wait

# Install dependencies
install-deps:
	@echo "Installing backend dependencies..."
	cd backend && poetry install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Format code
format:
	@echo "Formatting backend code..."
	cd backend && poetry run black app/
	@echo "Formatting frontend code..."
	cd frontend && npm run format || echo "Frontend formatting not configured"

# Lint code
lint:
	@echo "Linting backend code..."
	cd backend && poetry run flake8 app/ || echo "Backend linting not configured"
	@echo "Linting frontend code..."
	cd frontend && npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cd frontend && rm -rf dist/ node_modules/.vite/
	cd backend && rm -rf .pytest_cache/ __pycache__/

# Health checks
health:
	@echo "Checking backend health..."
	curl -f http://localhost:8000/healthz || echo "Backend health check failed"
	@echo "Checking frontend..."
	curl -f http://localhost:5173 || echo "Frontend health check failed"

# Help
help:
	@echo "Available commands:"
	@echo "  make dev         - Start both frontend and backend servers"
	@echo "  make install-deps - Install all dependencies"
	@echo "  make format      - Format code"
	@echo "  make lint        - Lint code"
	@echo "  make health      - Check health of both services"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make help        - Show this help message"
