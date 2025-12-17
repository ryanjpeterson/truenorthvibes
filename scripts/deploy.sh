#!/bin/bash
set -e

FORCE_DEPLOY=false
if [[ "$1" == "--force" ]]; then
    echo "⚠️  Force mode enabled: Ignoring git changes."
    FORCE_DEPLOY=true
fi

# 1. LOAD ENV VARS FIRST
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 2. Safety Checks
if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Error: DOMAIN_NAME is empty. Check your .env file."
  exit 1
fi

if [ -z "$APP_NAME" ]; then
  echo "❌ Error: APP_NAME is empty. Check your .env file."
  exit 1
fi

# --- Configuration ---
# Recommendation: Use variables for Nginx paths to improve portability across distributions
NGINX_AVAILABLE_DIR=${NGINX_AVAILABLE_DIR:-/etc/nginx/sites-available}
NGINX_CONFIG_PATH="${NGINX_AVAILABLE_DIR}/${DOMAIN_NAME}" 
DEPLOY_STATE_FILE=".deploy_state"

# --- Helper Functions ---

has_changed() {
    local SERVICE=$1
    local DIR=$2
    local LAST_HASH=""
    
    if [ "$FORCE_DEPLOY" = true ]; then
        return 0
    fi
    
    if [ -f "$DEPLOY_STATE_FILE" ]; then
        LAST_HASH=$(grep "^${SERVICE}=" "$DEPLOY_STATE_FILE" | cut -d'=' -f2)
    fi

    if [ -z "$LAST_HASH" ]; then
        return 0 
    fi

    if git diff --quiet "$LAST_HASH" HEAD -- "$DIR"; then
        return 1 
    else
        return 0 
    fi
}

update_deploy_state() {
    local SERVICE=$1
    local CURRENT_HASH=$(git rev-parse HEAD)
    
    if grep -q "^${SERVICE}=" "$DEPLOY_STATE_FILE"; then
        sed -i "s/^${SERVICE}=.*/${SERVICE}=${CURRENT_HASH}/" "$DEPLOY_STATE_FILE"
    else
        echo "${SERVICE}=${CURRENT_HASH}" >> "$DEPLOY_STATE_FILE"
    fi
}

deploy_service() {
    local SERVICE_NAME=$1
    local PORT_BLUE=$2
    local PORT_GREEN=$3

    local CONTAINER_BLUE="${APP_NAME}-${SERVICE_NAME}-blue"
    local CONTAINER_GREEN="${APP_NAME}-${SERVICE_NAME}-green"

    echo "🚀 Preparing to deploy $SERVICE_NAME for $APP_NAME..."

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_BLUE}$"; then
        CURRENT_COLOR="blue"
        CURRENT_PORT="$PORT_BLUE"
        
        TARGET_COLOR="green"
        TARGET_PORT="$PORT_GREEN"
        TARGET_CONTAINER="$CONTAINER_GREEN"
    else
        CURRENT_COLOR="green"
        CURRENT_PORT="$PORT_GREEN"
        
        TARGET_COLOR="blue"
        TARGET_PORT="$PORT_BLUE"
        TARGET_CONTAINER="$CONTAINER_BLUE"
    fi

    echo "   🔵 Current Active: $CURRENT_COLOR (Port $CURRENT_PORT)"
    echo "   🟢 Deploying To:   $TARGET_COLOR (Port $TARGET_PORT)"

    echo "   🏗️  Building ${TARGET_CONTAINER}..."
    
    # Recommendation: Use -p "${APP_NAME}" to ensure project isolation
    docker compose -p "${APP_NAME}" up -d --build --no-deps "${SERVICE_NAME}-${TARGET_COLOR}"

    echo "   ⏳ Waiting for health check..."
    LAST_LOG_TIME="0s"
    
    while [ "$(docker inspect -f '{{.State.Health.Status}}' "$TARGET_CONTAINER")" != "healthy" ]; do
        docker logs "$TARGET_CONTAINER" --since "$LAST_LOG_TIME" 2>&1 | tail -n 5
        LAST_LOG_TIME="5s"

        if [ "$(docker inspect -f '{{.State.Running}}' "$TARGET_CONTAINER")" == "false" ]; then
            echo "   ❌ ERROR: Container died during startup."
            docker logs "$TARGET_CONTAINER"
            exit 1
        fi
        sleep 5
    done

    echo "   ✅ ${TARGET_CONTAINER} is Healthy!"

    # Switch Ports in Nginx
    local SED_CMD="s/localhost:${CURRENT_PORT}/localhost:${TARGET_PORT}/g"
    sudo sed -i "$SED_CMD" "$NGINX_CONFIG_PATH"

    eval "${SERVICE_NAME}_TARGET_COLOR=${TARGET_COLOR}"
    eval "${SERVICE_NAME}_CURRENT_COLOR=${CURRENT_COLOR}"
}

# --- Main Script ---

echo "============================================"
echo "🚀 STARTING SMART ZERO-DOWNTIME DEPLOYMENT"
echo "   App: $APP_NAME | Domain: $DOMAIN_NAME"
echo "============================================"

echo "🗄️  Ensuring Database is up..."
# Recommendation: Use -p "${APP_NAME}" for the database service as well
docker compose -p "${APP_NAME}" up -d postgres
sleep 5

# 1. BACKEND DEPLOYMENT
DEPLOYED_BACKEND=false
ACTIVE_BACKEND_COLOR=""

if has_changed "backend" "backend/"; then
    echo "📦 Changes detected in Backend. Deploying..."
    deploy_service "backend" "$BACKEND_PORT_BLUE" "$BACKEND_PORT_GREEN"
    update_deploy_state "backend"
    DEPLOYED_BACKEND=true
    ACTIVE_BACKEND_COLOR=$backend_TARGET_COLOR
else
    echo "zzz No changes in Backend. Skipping."
    if docker ps --format '{{.Names}}' | grep -q "^${APP_NAME}-backend-blue$"; then
        ACTIVE_BACKEND_COLOR="blue"
    else
        ACTIVE_BACKEND_COLOR="green"
    fi
    echo "ℹ️  Active Backend is: $ACTIVE_BACKEND_COLOR"
fi

# CRITICAL: SET BACKEND URL
export STRAPI_INTERNAL_URL="http://backend-${ACTIVE_BACKEND_COLOR}:1337"
echo "🔗 Frontend will connect to: $STRAPI_INTERNAL_URL"


# 2. FRONTEND DEPLOYMENT
DEPLOYED_FRONTEND=false
if has_changed "frontend" "frontend/"; then
    echo "📦 Changes detected in Frontend. Deploying..."
    deploy_service "frontend" "$FRONTEND_PORT_BLUE" "$FRONTEND_PORT_GREEN"
    update_deploy_state "frontend"
    DEPLOYED_FRONTEND=true
else
    echo "zzz No changes in Frontend. Skipping."
fi


# 3. RELOAD NGINX
if [ "$DEPLOYED_BACKEND" = true ] || [ "$DEPLOYED_FRONTEND" = true ]; then
    echo "✨ Reloading Nginx to apply traffic switch..."
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Traffic switched!"
else
    echo "✨ No deployments made. Nginx reload skipped."
fi


# 4. CLEANUP
cleanup() {
    local SERVICE=$1
    local TARGET=$2
    local CURRENT=$3
    
    if [ "$TARGET" != "$CURRENT" ] && [ ! -z "$CURRENT" ]; then
        echo "🛑 Stopping old container: ${APP_NAME}-${SERVICE}-${CURRENT}"
        # Recommendation: Use -p "${APP_NAME}" during cleanup
        docker compose -p "${APP_NAME}" stop "${SERVICE}-${CURRENT}" || true
    fi
}

if [ "$DEPLOYED_BACKEND" = true ]; then
    cleanup "backend" "$backend_TARGET_COLOR" "$backend_CURRENT_COLOR"
fi

if [ "$DEPLOYED_FRONTEND" = true ]; then
    cleanup "frontend" "$frontend_TARGET_COLOR" "$frontend_CURRENT_COLOR"
fi

echo "============================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "============================================"