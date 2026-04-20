# LifeOS - Personal Life Management System

[![CI/CD Pipeline](https://github.com/pranto48/lifeos/actions/workflows/ci-cd.yaml/badge.svg)](https://github.com/pranto48/lifeos/actions/workflows/ci-cd.yaml)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue)](https://ghcr.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive personal life management application built with React, TypeScript, local db and Supabase.

## Features

- 📋 **Tasks Management** - Create, organize, and assign tasks with priorities and categories
- 📅 **Calendar Integration** - Sync with Google Calendar
- 💰 **Budget Tracking** - Track income, expenses, and budgets
- 🎯 **Goals** - Set and track personal and professional goals
- 📝 **Notes** - Secure note-taking with vault protection
- 👨‍👩‍👧‍👦 **Family Management** - Track family members, events, and documents
- 📊 **Habits** - Build and track daily habits
- 📈 **Investments** - Monitor your investment portfolio
- 💵 **Salary Tracking** - Track monthly salary and deductions

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **State**: React Query, React Context

## Development

### Prerequisites

- Node.js 18+ or Bun
- npm or bun package manager

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### Desktop (Windows .exe with Electron)

LifeOS can be packaged as a Windows installer (`LifeOS Setup.exe`) using Electron + electron-builder.

```bash
# Install dependencies
npm install

# Run desktop app in development mode (Vite + Electron)
npm run dev:desktop

# Build distributable Windows installer (.exe)
npm run dist:win
```

Generated artifacts are placed in the Electron builder output folder (for example `dist/` or `release/` depending on builder defaults/environment).

#### Step-by-step manual to create `LifeOS Setup.exe` (Windows)

1. Install **Node.js 18+** and **Git** on Windows.
2. Clone project and install dependencies:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lifeos.git
   cd lifeos
   npm install
   ```
3. Build installer:
   ```bash
   npm run dist:win
   ```
4. Find installer in the builder output directory (typically `dist/`).
5. Run installer on target PC and complete setup.

#### Desktop server URL configuration

- Electron exposes a secure bridge under `window.lifeosDesktop`.
- Server URL is saved in the desktop user config file:
  - `%APPDATA%/LifeOS/desktop-config.json` (Windows typical path via Electron `userData`)
- On first run of installed app, LifeOS Desktop opens a setup window asking for the server address.
  - Default example value: `https://my.arifmahmud.com`
  - You can change it before clicking **Save & Continue**.
- Use these renderer helpers:
  - `getServerUrl()` and `setServerUrl()` in `src/lib/serverConfig.ts`

#### Admin panel: download `lifeos.exe`

- In **Settings → Admin Panel → Desktop App**, admins can click **Download lifeos.exe**.
- Default download URL used by the admin button:
  - `https://your-domain/downloads/lifeos-setup.exe`
- To use a custom location (CDN/object storage/etc.), set:

```env
VITE_WINDOWS_EXE_URL=https://your-domain-or-cdn/path/lifeos-setup.exe
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Self-Hosted Deployment (Docker)

### Docker Compose Profiles

LifeOS ships with two readable Docker Compose profiles so the startup mode is obvious at a glance:

- **`dev`**: local iteration with the development-labelled web container.
- **`prod`**: long-running deployment defaults with the production-labelled web container.

You can either select a profile inline or set it once in `.env` with `COMPOSE_PROFILES`.

```bash
# Development profile
COMPOSE_PROFILES=dev docker compose up --build

# Production profile
COMPOSE_PROFILES=prod docker compose up -d
```

### Service Healthchecks

The root `docker-compose.yml` now includes healthchecks for every core service:

- **`postgres`** uses `pg_isready` so the backend only starts after the database accepts connections.
- **`backend`** polls `http://localhost:3001/api/health` before either web container is considered ready.
- **`lifeos-dev`** and **`lifeos-prod`** probe the local web root with `wget --spider` so `docker compose ps` exposes frontend readiness clearly.

### First Run

Use this checklist the first time you boot a self-hosted instance.

#### 1. Copy the environment template

```bash
cp .env.example .env
```

Required values to change before a real deployment:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`

Recommended optional values:

- `COMPOSE_PROFILES=dev` for local testing or `COMPOSE_PROFILES=prod` for a persistent install
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` if you want to pre-seed the first admin
- `APP_LICENSE_KEY` if your deployment requires license activation

#### 2. Start the stack

```bash
# Uses COMPOSE_PROFILES from .env

docker compose up -d
```

Or override the profile explicitly:

```bash
docker compose --profile dev up --build
# or
docker compose --profile prod up -d
```

#### 3. Open the application URL

By default, the app is available at:

- `http://localhost:3377`

If you changed `APP_PORT` or `LIFEOS_URL`, use that URL instead.

#### 4. Complete admin bootstrap

Choose one of these two bootstrap paths:

- **UI bootstrap**: leave `ADMIN_EMAIL` and `ADMIN_PASSWORD` blank, open the app, and complete the first-run admin wizard.
- **Pre-seeded bootstrap**: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before starting the stack so the backend can provision the initial admin automatically.

After signing in the first time, immediately rotate any placeholder credentials and store them in your password manager.

#### 5. Establish a backup strategy

At minimum, back up the PostgreSQL database volume on a schedule. A simple logical backup looks like this:

```bash
docker exec lifeos-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%Y%m%d).sql
```

To restore:

```bash
docker exec -i lifeos-db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup_20240101.sql
```

Recommended production practice:

- Run a scheduled `pg_dump` job at least daily.
- Store backups outside the Docker host.
- Test restore into a staging environment before you need it during an incident.
- Back up the `.env` file securely because it contains credentials required for recovery.

### Troubleshooting

#### Authentication problems

If sign-in or admin bootstrap fails:

1. Confirm the backend is healthy:
   ```bash
   docker compose ps
   docker compose logs backend --tail=100
   ```
2. Verify `JWT_SECRET` is set and identical across restarts. Changing it invalidates previously issued tokens.
3. If you pre-seeded `ADMIN_EMAIL` / `ADMIN_PASSWORD`, confirm the values were present in `.env` before the first startup.
4. Clear old browser cookies or open a private window if you previously switched between environments that used different secrets.

#### Import UUID mapping issues

If imported records fail because UUID references do not line up:

1. Make sure the source data preserves the original UUIDs for related entities.
2. Import parent records before child records so foreign-key lookups have targets available.
3. If an import was partially applied, remove the incomplete batch before retrying so you do not create duplicate UUID-to-record mappings.
4. Use database logs and backend logs together to identify the specific table or relation that rejected the UUID.

A helpful starting point is:

```bash
docker compose logs backend --tail=200
```

#### Database connectivity issues

If the backend cannot reach PostgreSQL:

1. Check database health and port bindings:
   ```bash
   docker compose ps
   docker compose logs postgres --tail=100
   ```
2. Confirm the `.env` values for `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` match what the backend expects.
3. Wait for the `postgres` healthcheck to pass before judging the app startup; the backend is configured to wait on it.
4. If you changed credentials after the volume was initialized, recreate the stack or update the database user manually because PostgreSQL keeps the original credentials inside the persisted volume.
5. Validate direct connectivity from the database container:
   ```bash
   docker exec -it lifeos-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
   ```

### Legacy setup wizard

The repository still includes `docker/docker-setup.sh` if you prefer the interactive bootstrap flow:

```bash
chmod +x docker/docker-setup.sh
./docker/docker-setup.sh
```

That script remains useful for guided setup, but the root `docker-compose.yml` plus `.env.example` now covers the full first-run flow documented above.

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Third-party integrations
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   └── translations/   # i18n translations
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
├── k8s/                # Kubernetes manifests
│   ├── deployment.yaml # Deployment configuration
│   ├── service.yaml    # Service definitions
│   ├── ingress.yaml    # Ingress rules
│   ├── configmap.yaml  # ConfigMaps and Secrets
│   ├── hpa.yaml        # Horizontal Pod Autoscaler
│   └── kustomization.yaml
├── .github/
│   └── workflows/
│       └── ci-cd.yaml  # GitHub Actions CI/CD
├── public/             # Static assets
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
└── nginx.conf          # Nginx configuration
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.21+)
- kubectl configured
- Ingress controller (nginx-ingress recommended)
- cert-manager (for TLS certificates)

### Quick Deploy

```bash
# Create namespace
kubectl create namespace lifeos

# Apply all manifests
kubectl apply -k k8s/ -n lifeos

# Check deployment status
kubectl get pods -n lifeos -l app=lifeos
kubectl get svc -n lifeos
kubectl get ingress -n lifeos
```

### Custom Configuration

1. **Update Ingress Host**: Edit `k8s/ingress.yaml` and replace `lifeos.example.com` with your domain.

2. **Configure Environment Variables**: Edit `k8s/configmap.yaml` with your Supabase credentials.

3. **TLS Certificates**: The ingress is configured for cert-manager with Let's Encrypt. Ensure cert-manager is installed:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

4. **Scaling**: The HPA will automatically scale pods based on CPU/memory usage. Adjust `k8s/hpa.yaml` as needed.

### Production Checklist

- [ ] Update ingress hostname
- [ ] Configure TLS certificates
- [ ] Set resource limits appropriately
- [ ] Configure pod disruption budgets
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions CI/CD pipeline.

### Pipeline Stages

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Test** - Run test suite
3. **Build** - Build the application
4. **Docker** - Build and push Docker image to GHCR
5. **Security Scan** - Trivy vulnerability scanning
6. **Deploy Staging** - Auto-deploy to staging (develop branch)
7. **Deploy Production** - Auto-deploy to production (main branch)

### Required GitHub Secrets

Configure these secrets in your repository settings:

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `KUBE_CONFIG_STAGING` | Base64-encoded kubeconfig for staging |
| `KUBE_CONFIG_PRODUCTION` | Base64-encoded kubeconfig for production |

### Generating Kubeconfig Secret

```bash
# Encode your kubeconfig
cat ~/.kube/config | base64 -w 0

# Add to GitHub Secrets as KUBE_CONFIG_STAGING or KUBE_CONFIG_PRODUCTION
```

### Manual Deployment

You can also manually trigger deployments from the Actions tab or use:

```bash
# Deploy specific tag
kubectl set image deployment/lifeos lifeos=ghcr.io/YOUR_USERNAME/lifeos:v1.0.0 -n lifeos
```

## Monitoring & Observability

### Health Checks

The application exposes health endpoints:

- **Liveness**: `GET /` - Returns 200 if app is running
- **Readiness**: `GET /` - Returns 200 if app is ready to serve traffic

### Prometheus Metrics (Optional)

Add Prometheus annotations to the deployment for metric scraping:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "80"
  prometheus.io/path: "/metrics"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

- **main** - Production-ready code
- **develop** - Integration branch for features
- **feature/** - Feature branches

## License

MIT License - see LICENSE file for details

## Docker First-Run Operations

### 1) Copy environment file

```bash
cp .env.example .env
```

Required secrets before production use:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_PASSWORD` (if pre-seeding admin)

### 2) Start services (dev/prod profiles)

```bash
# Production-style run (default)
docker compose --profile prod up -d

# Development-style run
# (same stack, faster health probing, foreground logs)
docker compose --profile dev up --build
```

### 3) Open URL

- App URL: `http://localhost:3377`
- If you changed `APP_PORT`, use `http://localhost:<APP_PORT>`.

### 4) Admin bootstrap

Choose one:
- Wizard flow: complete admin creation in UI on first load.
- Headless flow: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before first boot.

### 5) Backup strategy

Recommended:

```bash
# Logical backup
mkdir -p backups

docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "backups/lifeos-$(date +%F-%H%M%S).sql"

# Restore example
cat backups/lifeos-YYYY-MM-DD-HHMMSS.sql | docker compose exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

For disaster recovery, combine:
- Scheduled `pg_dump` snapshots (daily/hourly based on RPO).
- Off-site encrypted backup copy (object storage or secure NAS).
- Periodic restore drills in a staging environment.

## Troubleshooting (Self-Hosted Docker)

### Auth issues (login fails, invalid token)

- Verify backend secret consistency (`JWT_SECRET`) and restart services:
  ```bash
  docker compose down
  docker compose up -d
  ```
- If users were created with a previous JWT secret, rotate tokens by logging out/in.
- Confirm backend health:
  ```bash
  docker compose ps
  docker compose logs backend --tail=200
  ```

### Import problems (UUID mapping conflicts)

Symptoms: duplicate key, foreign-key mismatch, or missing references after import.

- Validate source/export keeps original UUIDs for parent+child records.
- Import parent tables first, then dependent tables.
- If remapping UUIDs, maintain a temporary old→new UUID map and rewrite foreign keys before insert.
- Check failing constraints directly:
  ```bash
  docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d"
  docker compose logs backend --tail=200
  ```

### Database connectivity errors

- Ensure `postgres` is healthy:
  ```bash
  docker compose ps
  docker compose logs postgres --tail=200
  ```
- Confirm `.env` values align across services (`DB_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`).
- From backend container, test connectivity path:
  ```bash
  docker compose exec backend sh -lc 'nc -zv postgres 5432'
  ```
- If credentials changed after initial boot, recreate stack volumes only when safe:
  ```bash
  docker compose down
  docker volume ls | grep lifeos
  # WARNING: deleting DB volume removes data
  ```
