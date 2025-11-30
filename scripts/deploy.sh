#!/bin/bash
set -e

FORCE_DEPLOY=false
if [[ "$1" == "--force" ]]; then
    echo "⚠️  Force mode enabled: Ignoring git changes."
    FORCE_DEPLOY=true
fi

# 1. LOAD ENV VARS FIRST
# This must happen before you use $DOMAIN_NAME below
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 2. Check if DOMAIN_NAME is set (Safety check)
if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Error: DOMAIN_NAME is empty. Check your .env file."
  exit 1
fi

# --- Configuration ---
NGINX_CONFIG_PATH="/etc/nginx/sites-available/${DOMAIN_NAME}" 
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
    local NGINX_REGEX=$4

    echo "🚀 Preparing to deploy $SERVICE_NAME..."

    # Determine Active Color
    if docker ps --format '{{.Names}}' | grep -q "${SERVICE_NAME}-blue"; then
        CURRENT_COLOR="blue"
        TARGET_COLOR="green"
        TARGET_PORT="$PORT_GREEN"
    else
        CURRENT_COLOR="green"
        TARGET_COLOR="blue"
        TARGET_PORT="$PORT_BLUE"
    fi

    echo "   🔵 Current Active: $CURRENT_COLOR"
    echo "   🟢 Deploying To:   $TARGET_COLOR (Port $TARGET_PORT)"

    # Build and Start Target
    echo "   🏗️  Building ${SERVICE_NAME}-${TARGET_COLOR}..."
    
    # NOTE: STRAPI_INTERNAL_URL is picked up from the environment export below
    docker compose up -d --build --no-deps "${SERVICE_NAME}-${TARGET_COLOR}"

    # Wait for Health
    echo "   ⏳ Waiting for health check..."
    LAST_LOG_TIME="0s"
    
    while [ "$(docker inspect -f '{{.State.Health.Status}}' "${SERVICE_NAME}-${TARGET_COLOR}")" != "healthy" ]; do
        # Stream logs to see progress
        docker logs "${SERVICE_NAME}-${TARGET_COLOR}" --since "$LAST_LOG_TIME" 2>&1 | tail -n 5
        LAST_LOG_TIME="5s"

        if [ "$(docker inspect -f '{{.State.Running}}' "${SERVICE_NAME}-${TARGET_COLOR}")" == "false" ]; then
            echo "   ❌ ERROR: Container died during startup."
            docker logs "${SERVICE_NAME}-${TARGET_COLOR}"
            exit 1
        fi
        sleep 5
    done

    echo "   ✅ ${SERVICE_NAME}-${TARGET_COLOR} is Healthy!"

    local SED_CMD="s/${NGINX_REGEX}/localhost:${TARGET_PORT}/g"
    sudo sed -i "$SED_CMD" "$NGINX_REGEX_PATH"

    eval "${SERVICE_NAME}_TARGET_COLOR=${TARGET_COLOR}"
    eval "${SERVICE_NAME}_CURRENT_COLOR=${CURRENT_COLOR}"
}

# --- Main Script ---

echo "============================================"
echo "🚀 STARTING SMART ZERO-DOWNTIME DEPLOYMENT"
echo "============================================"

echo "🗄️  Ensuring Database is up..."
docker compose up -d postgres
sleep 5

# ----------------------------
# 1. BACKEND DEPLOYMENT
# ----------------------------
DEPLOYED_BACKEND=false
ACTIVE_BACKEND_COLOR=""

if has_changed "backend" "backend/"; then
    echo "📦 Changes detected in Backend. Deploying..."
    NGINX_REGEX_PATH=$NGINX_CONFIG_PATH
    deploy_service "backend" "1337" "1338" "localhost:133[7-8]"
    update_deploy_state "backend"
    DEPLOYED_BACKEND=true
    # The active color is now the target of the deployment
    ACTIVE_BACKEND_COLOR=$backend_TARGET_COLOR
else
    echo "zzz No changes in Backend. Skipping."
    # Detect which backend is CURRENTLY running so we can link the frontend to it
    if docker ps --format '{{.Names}}' | grep -q "backend-blue"; then
        ACTIVE_BACKEND_COLOR="blue"
    else
        ACTIVE_BACKEND_COLOR="green"
    fi
    echo "ℹ️  Active Backend is: $ACTIVE_BACKEND_COLOR"
fi

# ----------------------------
# CRITICAL: SET BACKEND URL
# ----------------------------
# This variable is passed to docker-compose so the frontend knows who to talk to
export STRAPI_INTERNAL_URL="http://backend-${ACTIVE_BACKEND_COLOR}:1337"
echo "🔗 Frontend will connect to: $STRAPI_INTERNAL_URL"


# ----------------------------
# 2. FRONTEND DEPLOYMENT
# ----------------------------
DEPLOYED_FRONTEND=false
if has_changed "frontend" "frontend/"; then
    echo "📦 Changes detected in Frontend. Deploying..."
    NGINX_REGEX_PATH=$NGINX_CONFIG_PATH
    deploy_service "frontend" "3000" "3001" "localhost:300[0-1]"
    update_deploy_state "frontend"
    DEPLOYED_FRONTEND=true
else
    echo "zzz No changes in Frontend. Skipping."
fi


# ----------------------------
# 3. RELOAD NGINX
# ----------------------------
if [ "$DEPLOYED_BACKEND" = true ] || [ "$DEPLOYED_FRONTEND" = true ]; then
    echo "✨ Reloading Nginx to apply traffic switch..."
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Traffic switched!"
else
    echo "✨ No deployments made. Nginx reload skipped."
fi


# ----------------------------
# 4. CLEANUP
# ----------------------------
cleanup() {
    local SERVICE=$1
    local TARGET=$2
    local CURRENT=$3
    
    if [ "$TARGET" != "$CURRENT" ] && [ ! -z "$CURRENT" ]; then
        echo "🛑 Stopping old container: ${SERVICE}-${CURRENT}"
        docker compose stop "${SERVICE}-${CURRENT}" || true
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