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

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Self-Hosted Deployment (Docker)

### Quick Start with Setup Wizard

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Run the interactive setup
chmod +x docker/docker-setup.sh
./docker/docker-setup.sh
```

Choose your database (PostgreSQL or MySQL), and the setup wizard at `http://localhost:8080/setup` will guide you through configuring the database connection and creating your admin account.

### Docker Compose (PostgreSQL)

```bash
# Start with built-in PostgreSQL
docker-compose -f docker-compose.selfhosted.yml --profile with-postgres up -d
```

### Docker Compose (MySQL - XAMPP compatible)

```bash
# Start with MySQL
docker-compose -f docker-compose.selfhosted.yml --profile with-mysql up -d
```

### External Database (XAMPP, etc.)

```bash
# Start without bundled database - configure via setup wizard
docker-compose -f docker-compose.selfhosted.yml up -d

# Then open http://localhost:8080/setup and enter your DB credentials
```

### Environment Variables (.env)

Copy `docker/.env.example` to `docker/.env` and configure:

```env
DB_TYPE=postgresql        # or mysql
DB_HOST=localhost          # your DB server
DB_PORT=5432              # 5432 for PostgreSQL, 3306 for MySQL
DB_NAME=lifeos
DB_USER=lifeos
DB_PASSWORD=your_password
JWT_SECRET=change-this-to-random-string
```

### Cloud Deployment (Supabase)

```bash
# Build and run with Supabase backend
docker-compose up -d
```

### Manual Docker Build

```bash
# Build the image
docker build -t lifeos:latest .

# Run the container
docker run -d -p 8080:80 --name lifeos lifeos:latest

# View logs
docker logs -f lifeos

# Stop and remove
docker stop lifeos && docker rm lifeos
```

### Docker with Custom Environment

If you need to configure environment variables at build time:

```bash
# Build with build args
docker build \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your_key \
  -t lifeos:latest .
```

### Production Deployment with Docker

For production deployment with SSL, you can use the following `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  lifeos:
    build: .
    container_name: lifeos-app
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=your-domain.com
      - LETSENCRYPT_HOST=your-domain.com
      - LETSENCRYPT_EMAIL=your-email@example.com

  nginx-proxy:
    image: jwilder/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    restart: unless-stopped

  letsencrypt:
    image: jrcs/letsencrypt-nginx-proxy-companion
    container_name: letsencrypt
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    environment:
      - NGINX_PROXY_CONTAINER=nginx-proxy
    restart: unless-stopped

volumes:
  certs:
  vhost:
  html:
```

## Self-Hosting Guide

### Quick Start (Recommended)

The easiest way to get started with self-hosting:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Make the setup script executable
chmod +x docker/docker-setup.sh

# Run the interactive setup
./docker/docker-setup.sh
```

The setup script will:
- ✅ Check Docker requirements
- ✅ Auto-generate secure passwords
- ✅ Create admin credentials
- ✅ Start all services
- ✅ Display access URLs

### Default Admin Credentials

After first startup, login with:
- **Email**: `admin@lifeos.local`
- **Password**: `LifeOS@2024!`

⚠️ **IMPORTANT**: Change these credentials immediately after first login!

### Option 1: Docker with Internal Database (Fully Self-Hosted)

For a completely self-contained installation with internal PostgreSQL database:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Copy and configure environment
cp docker/.env.example docker/.env
# Edit docker/.env with your settings (or use auto-generated values)

# Start with internal database
docker-compose -f docker-compose.selfhosted.yml up -d

# Include optional services (pgAdmin for DB management)
docker-compose -f docker-compose.selfhosted.yml --profile with-admin up -d

# Include reverse proxy with SSL support
docker-compose -f docker-compose.selfhosted.yml --profile with-proxy up -d
```

**Access Points**:
- LifeOS App: `http://localhost:8080`
- pgAdmin (if enabled): `http://localhost:5050`

**Included Services**:
- PostgreSQL 16 (database)
- Redis 7 (session cache)
- LifeOS Application
- Optional: Nginx reverse proxy with SSL
- Optional: pgAdmin for database management

### Option 2: Docker with Cloud Backend

Use Docker for the frontend with cloud-hosted Supabase backend:

```bash
# Clone and configure
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos

# Build and run
docker-compose up -d
```

Configure environment variables in `docker-compose.yml` or `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Option 3: Static Hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to any static hosting service:
   - Nginx
   - Apache
   - Netlify
   - Vercel
   - Cloudflare Pages

### Docker Management

The interactive management script provides easy access to common operations:

```bash
./docker/docker-setup.sh
```

**Available Commands**:
| Command | Description |
|---------|-------------|
| Start services | Start core or all services |
| Stop services | Stop all running services |
| Restart services | Restart all services |
| View logs | View logs for specific services |
| Show status | Display service status |
| Backup database | Create database backup |
| Restore database | Restore from backup |
| Reset admin password | Generate new admin password |
| Update application | Pull and rebuild latest version |
| Cleanup | Remove all containers and data |

### Backup & Restore

```bash
# Create backup
docker exec lifeos-db pg_dump -U lifeos lifeos > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i lifeos-db psql -U lifeos lifeos < backup_20240101.sql
```

Or use the management script:
```bash
./docker/docker-setup.sh
# Select option 6 for backup, 7 for restore
```

## Self-Hosted Database Schema

If you're running with the internal database (`docker-compose.selfhosted.yml`), the database schema is automatically initialized from `docker/init-db.sql`. This includes:

- User authentication tables
- Role-based access control
- Device inventory with specifications
- Support user management
- All core application tables

To customize or extend the schema, modify `docker/init-db.sql` before first startup.

## Backup & Restore (Self-Hosted)

```bash
# Backup database
docker exec lifeos-db pg_dump -U lifeos lifeos > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i lifeos-db psql -U lifeos lifeos < backup_20240101.sql
```

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
