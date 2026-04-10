#!/bin/bash
# =============================================================================
# Objetiva Comercios Admin — Instalador automatico
# =============================================================================
# Uso:
#   curl -sL https://raw.githubusercontent.com/objetiva-comercios/objetiva-comercios-admin/main/install.sh | bash
#
# O desde el VPS:
#   bash /opt/objetiva-comercios/objetiva-comercios-admin/install.sh
#
# Que hace:
#   1. Verifica dependencias (git, docker, docker compose)
#   2. Protege contra sobreescritura de repos de desarrollo
#   3. Clona o actualiza el repositorio en /opt/objetiva-comercios/
#   4. Preserva archivos .env.production y uploads/ si existen
#   5. Crea la red Docker si no existe
#   6. Construye imagenes Docker (web + backend)
#   7. Levanta servicios con docker compose
#   8. Ejecuta health check del backend
#   9. Muestra resumen de acceso y configuracion DNS
#
# Requisitos:
#   - Docker >= 20.10 con Docker Compose v2
#   - Git
#   - Traefik corriendo en red sanchez_docker_network
#   - PostgreSQL accesible desde la red Docker
#   - Proyecto Supabase configurado (auth)
# =============================================================================

set -euo pipefail

# -- Config ------------------------------------------------------------------
GIT_USER="objetiva-comercios"
APP_NAME="objetiva-comercios-admin"
INSTALL_DIR="/opt/${GIT_USER}/${APP_NAME}"
REPO_URL="https://github.com/${GIT_USER}/${APP_NAME}.git"
DOCKER_NETWORK="sanchez_docker_network"
DOMAIN="erp.sanchezrepuestos.com.ar"
HEALTH_ENDPOINT="/health"
HEALTH_PORT="3001"
CONTAINER_BACKEND="erp-backend"
CONTAINER_WEB="erp-web"

# -- Colores -----------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# -- Banner ------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  Objetiva Comercios Admin — Instalador"
echo "=========================================="
echo ""

# -- Verificar dependencias --------------------------------------------------
info "Verificando dependencias..."

command -v git >/dev/null 2>&1 || error "git no esta instalado"
ok "git encontrado"

command -v docker >/dev/null 2>&1 || error "docker no esta instalado"
ok "docker encontrado"

docker compose version >/dev/null 2>&1 || error "docker compose v2 no esta disponible"
ok "docker compose v2 encontrado"

# -- Proteccion contra sobreescritura de repo de desarrollo ------------------
if [ -d "$INSTALL_DIR/.git" ]; then
  DIRTY_FILES=$(git -C "$INSTALL_DIR" status --porcelain 2>/dev/null | wc -l)
  if [ "$DIRTY_FILES" -gt 0 ]; then
    error "$INSTALL_DIR tiene $DIRTY_FILES cambios sin commitear — parece ser un repo de desarrollo. Abortando para no pisarlo."
  fi
fi

# -- Manejar instalacion previa ----------------------------------------------
REINSTALL=false
BACKUP_DIR=""

if [ -d "$INSTALL_DIR" ]; then
  warn "Directorio $INSTALL_DIR ya existe"
  info "Deteniendo servicios..."
  cd "$INSTALL_DIR"
  docker compose down 2>/dev/null || true

  # Backup de archivos de entorno y uploads
  BACKUP_DIR=$(mktemp -d)

  if [ -f "apps/backend/.env.production" ]; then
    cp apps/backend/.env.production "$BACKUP_DIR/backend.env.production"
    ok "Backup: apps/backend/.env.production"
  fi
  if [ -f "apps/web/.env.production" ]; then
    cp apps/web/.env.production "$BACKUP_DIR/web.env.production"
    ok "Backup: apps/web/.env.production"
  fi

  # Preservar uploads
  if [ -d "uploads" ] && [ "$(ls -A uploads 2>/dev/null)" ]; then
    info "Preservando directorio uploads/..."
    cp -a uploads "$BACKUP_DIR/uploads"
    ok "Backup: uploads/"
  fi

  cd /tmp
  rm -rf "$INSTALL_DIR"
  REINSTALL=true
  ok "Directorio anterior eliminado"
fi

# -- Clonar repositorio ------------------------------------------------------
info "Clonando repositorio..."
mkdir -p "/opt/${GIT_USER}"
git clone "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"
ok "Repositorio clonado en $INSTALL_DIR"

# -- Restaurar backups -------------------------------------------------------
if [ "$REINSTALL" = true ] && [ -n "$BACKUP_DIR" ]; then
  if [ -f "$BACKUP_DIR/backend.env.production" ]; then
    cp "$BACKUP_DIR/backend.env.production" apps/backend/.env.production
    ok "Restaurado: apps/backend/.env.production"
  fi
  if [ -f "$BACKUP_DIR/web.env.production" ]; then
    cp "$BACKUP_DIR/web.env.production" apps/web/.env.production
    ok "Restaurado: apps/web/.env.production"
  fi
  if [ -d "$BACKUP_DIR/uploads" ]; then
    cp -a "$BACKUP_DIR/uploads" uploads
    ok "Restaurado: uploads/"
  fi
  rm -rf "$BACKUP_DIR"
fi

# -- Verificar archivos de entorno -------------------------------------------
MISSING_ENV=false

if [ ! -f "apps/backend/.env.production" ]; then
  warn "Falta apps/backend/.env.production"
  info "Crea el archivo con las siguientes variables:"
  echo ""
  echo "  cat > $INSTALL_DIR/apps/backend/.env.production << 'ENVEOF'"
  echo "  DATABASE_URL=postgresql://usuario:password@postgres:5432/erp_db"
  echo "  SUPABASE_PROJECT_ID=tu-project-id"
  echo "  SUPABASE_JWT_SECRET=tu-jwt-secret"
  echo "  PORT=3001"
  echo "  NODE_ENV=production"
  echo "  CORS_ORIGINS=http://${DOMAIN}"
  echo "  ENVEOF"
  echo ""
  MISSING_ENV=true
fi

if [ ! -f "apps/web/.env.production" ]; then
  warn "Falta apps/web/.env.production"
  info "Crea el archivo con las siguientes variables:"
  echo ""
  echo "  cat > $INSTALL_DIR/apps/web/.env.production << 'ENVEOF'"
  echo "  NEXT_PUBLIC_SUPABASE_URL=https://tu-project-id.supabase.co"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key"
  echo "  NEXT_PUBLIC_API_URL=http://${DOMAIN}"
  echo "  API_URL=http://erp-backend:3001"
  echo "  ENVEOF"
  echo ""
  MISSING_ENV=true
fi

if [ "$MISSING_ENV" = true ]; then
  error "Configura los archivos .env.production y vuelve a correr el instalador"
fi

ok "Archivos de entorno verificados"

# -- Crear red Docker --------------------------------------------------------
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  info "Creando red Docker: $DOCKER_NETWORK"
  docker network create "$DOCKER_NETWORK"
  ok "Red creada"
else
  ok "Red Docker $DOCKER_NETWORK ya existe"
fi

# -- Crear directorio de uploads ---------------------------------------------
mkdir -p uploads/articulos/etiquetas uploads/articulos/producto
ok "Directorio uploads/ verificado"

# -- Build y deploy ----------------------------------------------------------
info "Construyendo imagenes Docker (esto puede tardar unos minutos)..."
if [ "$REINSTALL" = true ]; then
  docker compose build --no-cache
else
  docker compose build
fi
ok "Imagenes construidas"

info "Levantando servicios..."
docker compose up -d
ok "Servicios iniciados"

# -- Health check ------------------------------------------------------------
info "Esperando que el backend arranque..."
RETRIES=0
MAX_RETRIES=30

while [ $RETRIES -lt $MAX_RETRIES ]; do
  if docker exec "$CONTAINER_BACKEND" wget -qO- "http://localhost:${HEALTH_PORT}${HEALTH_ENDPOINT}" >/dev/null 2>&1; then
    ok "Backend saludable"
    break
  fi
  RETRIES=$((RETRIES + 1))
  sleep 2
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
  warn "Health check fallo despues de ${MAX_RETRIES} intentos (60s)"
  info "Logs del backend:"
  docker compose logs --tail 30 erp-backend
  echo ""
  info "Logs del web:"
  docker compose logs --tail 15 erp-web
  error "El backend no responde. Revisa los logs arriba."
fi

# Verificar que el web tambien esta corriendo
if docker inspect --format='{{.State.Running}}' "$CONTAINER_WEB" 2>/dev/null | grep -q true; then
  ok "Web frontend corriendo"
else
  warn "El contenedor web no esta corriendo"
  docker compose logs --tail 15 erp-web
fi

# -- Resultado ---------------------------------------------------------------
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "<IP-TAILSCALE>")

echo ""
echo "=========================================="
echo -e "  ${GREEN}Instalacion completada${NC}"
echo "=========================================="
echo ""
echo "  Directorio: ${INSTALL_DIR}"
echo ""
echo "  Servicios:"
echo "    - erp-web:     Next.js (puerto 3000 interno)"
echo "    - erp-backend: NestJS  (puerto 3001 interno)"
echo ""
echo "  Acceso:"
echo "    URL: http://${DOMAIN}"
echo "    API: http://${DOMAIN}/api"
echo ""
echo "  DNS (agregar en /etc/hosts si no hay DNS publico):"
echo "    ${TAILSCALE_IP}    ${DOMAIN}"
echo ""
echo "  Comandos utiles:"
echo "    cd ${INSTALL_DIR}"
echo "    docker compose logs -f          # Ver logs"
echo "    docker compose restart          # Reiniciar"
echo "    docker compose down             # Detener"
echo "    docker compose up -d --build    # Rebuild y deploy"
echo ""
echo "  Imagenes de articulos:"
echo "    Directorio: ${INSTALL_DIR}/uploads/"
echo ""
