#!/bin/bash
# ============================================
# SENIQU BACKEND - Tencent Cloud Deploy Script
# ============================================
# Usage:
#   ./deploy-tencent.sh [build|push|deploy|all]
#
# Prerequisites:
#   - Docker installed locally
#   - Tencent Cloud CLI (tccli) configured (optional)
#   - Access to Tencent Container Registry (TCR)
#
# Environment Variables (set before running):
#   TCR_REGISTRY  - Your TCR registry URL (e.g., ccr.ccs.tencentyun.com)
#   TCR_NAMESPACE - Your TCR namespace
#   TCR_REPO      - Repository name (default: seniqu-backend)
#   IMAGE_TAG     - Image tag (default: latest)
#   SERVER_HOST   - Tencent Cloud server IP for deployment
#   SERVER_USER   - SSH user for deployment (default: root)

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
TCR_REGISTRY="${TCR_REGISTRY:-ccr.ccs.tencentyun.com}"
TCR_NAMESPACE="${TCR_NAMESPACE:-seniqu}"
TCR_REPO="${TCR_REPO:-seniqu-backend}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"
FULL_IMAGE="${TCR_REGISTRY}/${TCR_NAMESPACE}/${TCR_REPO}:${IMAGE_TAG}"
LATEST_IMAGE="${TCR_REGISTRY}/${TCR_NAMESPACE}/${TCR_REPO}:latest"

SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-root}"
CONTAINER_NAME="seniqu-backend"
HOST_PORT="${HOST_PORT:-3001}"
CONTAINER_PORT="${CONTAINER_PORT:-3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# FUNCTIONS
# ============================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    log_success "Prerequisites check passed."
}

build_image() {
    log_info "Building Docker image: ${FULL_IMAGE}"
    
    docker build \
        --platform linux/amd64 \
        -t "${FULL_IMAGE}" \
        -t "${LATEST_IMAGE}" \
        -f Dockerfile \
        .
    
    log_success "Image built successfully: ${FULL_IMAGE}"
    
    # Show image size
    docker images "${FULL_IMAGE}" --format "Size: {{.Size}}"
}

push_image() {
    log_info "Pushing image to Tencent Container Registry..."
    log_info "Registry: ${TCR_REGISTRY}"
    
    # Login to TCR (user must have configured credentials)
    log_warn "Make sure you are logged in to TCR:"
    log_warn "  docker login ${TCR_REGISTRY} --username=<your_tencent_account_id>"
    echo ""
    
    docker push "${FULL_IMAGE}"
    docker push "${LATEST_IMAGE}"
    
    log_success "Image pushed successfully!"
    log_info "Tagged: ${FULL_IMAGE}"
    log_info "Latest: ${LATEST_IMAGE}"
}

deploy_to_server() {
    if [ -z "${SERVER_HOST}" ]; then
        log_error "SERVER_HOST is not set. Please set it before deploying."
        log_info "Usage: SERVER_HOST=your_server_ip ./deploy-tencent.sh deploy"
        exit 1
    fi
    
    log_info "Deploying to Tencent Cloud server: ${SERVER_HOST}"
    
    # Copy env file and keys to server
    log_info "Uploading environment configuration and PEM keys..."
    ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p /opt/seniqu"
    scp .env.tencent private.pem public.pem "${SERVER_USER}@${SERVER_HOST}:/opt/seniqu/"
    
    # Deploy via SSH
    ssh "${SERVER_USER}@${SERVER_HOST}" << ENDSSH
        set -e
        
        echo "[INFO] Logging in to TCR..."
        docker login ${TCR_REGISTRY} 2>/dev/null || true
        
        echo "[INFO] Pulling latest image..."
        docker pull ${LATEST_IMAGE}
        
        echo "[INFO] Stopping existing container..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
        
        echo "[INFO] Starting new container..."
        docker run -d \
            --name ${CONTAINER_NAME} \
            --restart unless-stopped \
            -p ${HOST_PORT}:${CONTAINER_PORT} \
            --env-file /opt/seniqu/.env.tencent \
            -v /opt/seniqu/private.pem:/app/private.pem:ro \
            -v /opt/seniqu/public.pem:/app/public.pem:ro \
            -e NODE_ENV=production \
            -e PORT=${CONTAINER_PORT} \
            -e NODE_OPTIONS="--max-old-space-size=512" \
            --memory=1g \
            --cpus=1.0 \
            --log-driver=json-file \
            --log-opt max-size=10m \
            --log-opt max-file=3 \
            ${LATEST_IMAGE}
        
        echo "[INFO] Waiting for health check..."
        sleep 10
        
        if docker ps | grep -q ${CONTAINER_NAME}; then
            echo "[SUCCESS] Container is running!"
            docker logs --tail 20 ${CONTAINER_NAME}
        else
            echo "[ERROR] Container failed to start. Logs:"
            docker logs ${CONTAINER_NAME}
            exit 1
        fi
ENDSSH
    
    log_success "Deployment complete! Backend is running at http://${SERVER_HOST}:${HOST_PORT}"
}

show_usage() {
    echo ""
    echo "SENIQU Backend - Tencent Cloud Deployment"
    echo "=========================================="
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build   - Build Docker image locally"
    echo "  push    - Push image to Tencent Container Registry"
    echo "  deploy  - Deploy to Tencent Cloud server via SSH"
    echo "  all     - Build, push, and deploy"
    echo "  local   - Build and run locally with docker-compose"
    echo ""
    echo "Environment Variables:"
    echo "  TCR_REGISTRY   - TCR URL (default: ccr.ccs.tencentyun.com)"
    echo "  TCR_NAMESPACE  - TCR namespace (default: seniqu)"
    echo "  TCR_REPO       - Repository name (default: seniqu-backend)"
    echo "  IMAGE_TAG      - Image tag (default: timestamp)"
    echo "  SERVER_HOST    - Target server IP (required for deploy)"
    echo "  SERVER_USER    - SSH user (default: root)"
    echo ""
}

run_local() {
    log_info "Building and running locally with docker-compose..."
    
    if [ ! -f ".env.tencent" ]; then
        log_warn ".env.tencent not found. Copying from .env for local testing..."
        cp .env .env.tencent 2>/dev/null || true
    fi
    
    docker compose up --build -d
    
    log_success "Backend running locally at http://localhost:${HOST_PORT}"
    log_info "View logs: docker compose logs -f"
}

# ============================================
# MAIN
# ============================================

check_prerequisites

case "${1:-help}" in
    build)
        build_image
        ;;
    push)
        push_image
        ;;
    deploy)
        deploy_to_server
        ;;
    all)
        build_image
        push_image
        deploy_to_server
        ;;
    local)
        run_local
        ;;
    *)
        show_usage
        ;;
esac
