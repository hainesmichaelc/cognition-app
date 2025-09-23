.PHONY: dev test format lint install-deps clean

# Development - start both frontend and backend
dev:
	@echo "Starting development servers..."
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@$(MAKE) check-api-key
	@cd backend && poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000 & \
	cd frontend && npm run dev -- --host 0.0.0.0 --port 5173 & \
	wait

# Development with test data - start both frontend and backend with test data loaded
test:
	@echo "Starting development servers with test data..."
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@$(MAKE) check-api-key
	@cd backend && LOAD_TEST_DATA=true poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000 & \
	cd frontend && npm run dev -- --host 0.0.0.0 --port 5173 & \
	wait

# Check for DEVIN_API_KEY and prompt if missing
check-api-key:
	@if [ ! -f backend/.env ]; then \
		echo "Creating backend/.env file..."; \
		touch backend/.env; \
	fi
	@if ! grep -q "DEVIN_API_KEY=" backend/.env || grep -q "DEVIN_API_KEY=$$" backend/.env || grep -q "DEVIN_API_KEY= *$$" backend/.env; then \
		echo ""; \
		echo "🔑 DEVIN_API_KEY not found or empty in backend/.env"; \
		echo "Please enter your Devin API key:"; \
		read -p "DEVIN_API_KEY: " api_key; \
		if [ -n "$$api_key" ]; then \
			if grep -q "DEVIN_API_KEY=" backend/.env; then \
				sed -i.bak "s/DEVIN_API_KEY=.*/DEVIN_API_KEY=$$api_key/" backend/.env && rm -f backend/.env.bak; \
			else \
				echo "DEVIN_API_KEY=$$api_key" >> backend/.env; \
			fi; \
			echo "✅ API key saved to backend/.env"; \
		else \
			echo "❌ No API key provided. Please set DEVIN_API_KEY in backend/.env manually."; \
			exit 1; \
		fi; \
	else \
		echo "✅ DEVIN_API_KEY found in backend/.env"; \
	fi

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
	@echo "  make dev         - Start both frontend and backend servers (clean, no test data)"
	@echo "  make test        - Start both frontend and backend servers with comprehensive test data"
	@echo "                     (includes 25+ test issues with various scenarios for dashboard testing)"
	@echo "  make install-deps - Install all dependencies"
	@echo "  make format      - Format code"
	@echo "  make lint        - Lint code"
	@echo "  make health      - Check health of both services"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make help        - Show this help message"
