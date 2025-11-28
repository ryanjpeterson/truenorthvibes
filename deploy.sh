#!/bin/bash
set -e

# --- Configuration ---
NGINX_CONFIG_PATH="/etc/nginx/sites-available/vibes.ryanjpeterson.dev"
DEPLOY_STATE_FILE=".deploy_state"

# --- Helper Functions ---

# $1 = Service Name (e.g., "backend" or "frontend")
# $2 = Directory to check for changes (e.g., "backend/" or "frontend/")
has_changed() {
    local SERVICE=$1
    local DIR=$2
    
    # Get the last deployed commit hash for this service
    if [ -f "$DEPLOY_STATE_FILE" ]; then
        LAST_HASH=$(grep "^${SERVICE}=" "$DEPLOY_STATE_FILE" | cut -d'=' -f2)
    fi

    # If no record exists, force deploy
    if [ -z "$LAST_HASH" ]; then
        return 0 # True
    fi

    # Check for diffs between last deploy and HEAD
    if git diff --quiet "$LAST_HASH" HEAD -- "$DIR"; then
        return 1 # False (No changes)
    else
        return 0 # True (Changes found)
    fi
}

update_deploy_state() {
    local SERVICE=$1
    local CURRENT_HASH=$(git rev-parse HEAD)
    
    # Update or append the hash in the state file
    if grep -q "^${SERVICE}=" "$DEPLOY_STATE_FILE"; then
        sed -i "s/^${SERVICE}=.*/${SERVICE}=${CURRENT_HASH}/" "$DEPLOY_STATE_FILE"
    else
        echo "${SERVICE}=${CURRENT_HASH}" >> "$DEPLOY_STATE_FILE"
    fi
}

# $1 = Service Name (e.g., "backend")
# $2 = Blue Port
# $3 = Green Port
# $4 = Nginx Sed Pattern (regex to replace port)
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
        # Default to green if blue isn't running (or first run)
        CURRENT_COLOR="green"
        TARGET_COLOR="blue"
        TARGET_PORT="$PORT_BLUE"
    fi

    echo "   🔵 Current Active: $CURRENT_COLOR"
    echo "   🟢 Deploying To:   $TARGET_COLOR (Port $TARGET_PORT)"

    # Build and Start Target
    echo "   🏗️  Building ${SERVICE_NAME}-${TARGET_COLOR}..."
    docker compose up -d --build --no-deps "${SERVICE_NAME}-${TARGET_COLOR}"

    # Wait for Health
    echo "   ⏳ Waiting for health check..."
    LAST_LOG_TIME="0s"
    
    while [ "$(docker inspect -f '{{.State.Health.Status}}' "${SERVICE_NAME}-${TARGET_COLOR}")" != "healthy" ]; do
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

    # Update Nginx Config
    # We use the provided regex pattern to replace the port in the config
    # Example Regex: s/localhost:133[7-8]/localhost:1338/g
    local SED_CMD="s/${NGINX_REGEX}/localhost:${TARGET_PORT}/g"
    sudo sed -i "$SED_CMD" "$NGINX_REGEX_PATH"

    # We defer Nginx reload to the very end to batch updates
    
    # Store the target color to stop the old one later
    eval "${SERVICE_NAME}_TARGET_COLOR=${TARGET_COLOR}"
    eval "${SERVICE_NAME}_CURRENT_COLOR=${CURRENT_COLOR}"
}

# --- Main Script ---

echo "============================================"
echo "🚀 STARTING SMART ZERO-DOWNTIME DEPLOYMENT"
echo "============================================"

# Ensure Postgres is up (Shared Resource)
echo "🗄️  Ensuring Database is up..."
docker compose up -d postgres
# Simple wait for postgres
sleep 5

# 1. CHECK & DEPLOY BACKEND
DEPLOYED_BACKEND=false
if has_changed "backend" "backend/"; then
    echo "📦 Changes detected in Backend. Deploying..."
    # Regex explains: Replace localhost:1337 or 1338 with new port
    NGINX_REGEX_PATH=$NGINX_CONFIG_PATH
    deploy_service "backend" "1337" "1338" "localhost:133[7-8]"
    update_deploy_state "backend"
    DEPLOYED_BACKEND=true
else
    echo "zzz No changes in Backend. Skipping."
    # We still need to know the 'current' color if we want to stop nothing, 
    # but strictly we only stop if we deployed.
fi

# 2. CHECK & DEPLOY FRONTEND
DEPLOYED_FRONTEND=false
if has_changed "frontend" "frontend/"; then
    echo "📦 Changes detected in Frontend. Deploying..."
    # Regex explains: Replace localhost:3000 or 3001 with new port
    NGINX_REGEX_PATH=$NGINX_CONFIG_PATH
    deploy_service "frontend" "3000" "3001" "localhost:300[0-1]"
    update_deploy_state "frontend"
    DEPLOYED_FRONTEND=true
else
    echo "zzz No changes in Frontend. Skipping."
fi

# 3. RELOAD NGINX (If anything changed)
if [ "$DEPLOYED_BACKEND" = true ] || [ "$DEPLOYED_FRONTEND" = true ]; then
    echo "✨ Reloading Nginx to apply traffic switch..."
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Traffic switched!"
else
    echo "✨ No deployments made. Nginx reload skipped."
fi

# 4. CLEANUP OLD CONTAINERS
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