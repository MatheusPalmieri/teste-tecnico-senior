.PHONY: setup dev dev-frontend down seed lint test-unit test-back test-front \
        test-e2e test-all check backend-e2e e2e-db

BACKEND = docker compose run --rm backend

E2E_BACKEND_CMD = sh -c "python manage.py migrate --settings=config.settings.e2e \
	&& python manage.py runserver 0.0.0.0:8000 --noreload --settings=config.settings.e2e"
E2E_BACKEND_ARGS = --rm --service-ports -e E2E_REDIS_URL=redis://redis:6379/1

setup:
	test -f backend/.env || cp backend/.env.example backend/.env
	test -f frontend/.env || cp frontend/.env.example frontend/.env
	docker compose build backend
	$(BACKEND) sh -c "python manage.py migrate && python manage.py seed_demo"
	docker compose up -d
	cd frontend && npm install

dev:
	docker compose up -d
	cd frontend && npm run dev

dev-frontend:
	cd frontend && npm run dev

down:
	docker compose down

seed:
	$(BACKEND) python manage.py seed_demo

lint:
	$(BACKEND) sh -c "ruff check . && ruff format --check . && mypy ."
	cd frontend && npm run lint && npm run format:check && npm run typecheck
	cd e2e && npx tsc --noEmit

test-unit: test-back test-front

test-back:
	docker compose run --rm -e CACHE_ENABLED=False backend pytest --cov --cov-report=term-missing

test-front:
	cd frontend && npm run test -- --coverage

# Banco próprio do E2E: o reset apaga reservas e hóspedes.
e2e-db:
	docker compose up -d db redis --wait
	docker compose exec -T db psql -U hotel -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'hotel_e2e'" | grep -q 1 \
		|| docker compose exec -T db createdb -U hotel hotel_e2e

backend-e2e: e2e-db
	docker compose stop backend
	docker compose run $(E2E_BACKEND_ARGS) backend $(E2E_BACKEND_CMD)

test-e2e: e2e-db
	cd frontend && npm run build
	cd e2e && npm install && npx playwright install --with-deps chromium firefox
	docker compose stop backend
	docker compose run -d --name hotel-e2e-backend $(E2E_BACKEND_ARGS) backend $(E2E_BACKEND_CMD)
	for i in $$(seq 60); do curl -sf http://localhost:8000/api/health/ >/dev/null && break; sleep 1; done
	cd e2e && E2E_EXTERNAL_BACKEND=1 npx playwright test; status=$$?; \
		docker rm -f hotel-e2e-backend >/dev/null; docker compose up -d backend; exit $$status

test-all: test-unit test-e2e

check: lint test-all
