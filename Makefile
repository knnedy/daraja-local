.PHONY: build clean run dev web-build go-build

build: web-build go-build

web-build:
	cd web && pnpm install && pnpm run build
	@test -f web/out/index.html || \
		(echo "ERROR: web/out/index.html not found. Frontend build failed." && exit 1)
	rm -rf cmd/daraja-local/out
	cp -r web/out cmd/daraja-local/out

go-build: web-build
	go build -o bin/daraja-local ./cmd/daraja-local

run: build
	./bin/daraja-local

dev:
	@trap 'kill 0' EXIT INT TERM; \
	echo "Starting GO backend on :7060 (air hot-reload)..."; \
	DARAJA_LOCAL_ENV=development air & \
	echo "Starting Next.js dev server on :3000..."; \
	cd web && pnpm dev; \
	wait
	
clean:
	rm -rf web/out web/.next bin cmd/daraja-local/out