#!/bin/bash
set -e

# Configuration
NGINX_CONFIG_PATH="/etc/nginx/sites-available/vibes.ryanjpeterson.dev"

echo "🚀 STARTING ZERO-DOWNTIME DEPLOYMENT"
echo "--------------------------------------"

# 1. Ensure Database and Backend are Up & Healthy
echo "🗄️  Checking Backend status..."
docker compose up -d postgres backend

echo "⏳ Waiting for Backend health..."
while [ "`docker inspect -f {{.State.Health.Status}} blog_backend`" != "healthy" ]; do
    echo "   ... Backend status: `docker inspect -f {{.State.Health.Status}} blog_backend` (waiting 3s)"
    sleep 3
done
echo "✅ Backend is Ready!"

# 2. Determine which Color to Deploy
# We check which container is currently running to decide the target.
if docker ps --format '{{.Names}}' | grep -q "frontend-blue"; then
    CURRENT_COLOR="blue"
    TARGET_COLOR="green"
    TARGET_PORT="3001"
else
    CURRENT_COLOR="green" # Default if neither or green is running
    TARGET_COLOR="blue"
    TARGET_PORT="3000"
fi

echo "🔵 Current Active: $CURRENT_COLOR"
echo "🟢 Deploying To:   $TARGET_COLOR (Port $TARGET_PORT)"

# 3. Build and Start the Target Container
# --no-deps ensures we don't restart the backend/db
echo "🏗️  Building and Starting frontend-$TARGET_COLOR..."
docker compose up -d --build --no-deps frontend-$TARGET_COLOR

# 4. Wait for the New Container to Finish Building & Start Serving
echo "⏳ Waiting for frontend-$TARGET_COLOR to pass healthchecks..."
echo "   (Streaming build logs below...)"

# Initialize a timestamp to track logs we've already seen
LAST_LOG_TIME="0s"

# Loop until healthy
while [ "$(docker inspect -f '{{.State.Health.Status}}' frontend-$TARGET_COLOR)" != "healthy" ]; do
    
    # 1. Show new logs since the last check
    # We use '2>&1' to capture both stdout and stderr (errors)
    docker logs frontend-$TARGET_COLOR --since "$LAST_LOG_TIME" 2>&1
    
    # Update timestamp to "now" for the next loop iteration
    # (Using '1s' overlap ensures we don't miss lines between commands)
    LAST_LOG_TIME="5s" 

    # 2. Check if the container died (Build failed)
    if [ "$(docker inspect -f '{{.State.Running}}' frontend-$TARGET_COLOR)" == "false" ]; then
        echo "❌ ERROR: Container stopped unexpectedly! Build likely failed."
        echo "⬇️ FULL LOGS BELOW ⬇️"
        docker logs frontend-$TARGET_COLOR
        exit 1
    fi

    # Sleep briefly to avoid hammering the Docker daemon
    sleep 5
done

# Show any final logs that appeared right before it became healthy
docker logs frontend-$TARGET_COLOR --since "$LAST_LOG_TIME" 2>&1

echo "✅ frontend-$TARGET_COLOR is Healthy and Serving!"

# Use sed to update the proxy_pass line in your config
# Matches: proxy_pass http://localhost:300X;
sudo sed -i "s/proxy_pass http:\/\/localhost:300[0-1];/proxy_pass http:\/\/localhost:$TARGET_PORT;/" $NGINX_CONFIG_PATH

# 6. Reload Nginx
echo "✨ Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 7. Stop the Old Container to save resources
if [ "$CURRENT_COLOR" != "$TARGET_COLOR" ]; then
    echo "🛑 Stopping old container: frontend-$CURRENT_COLOR"
    docker compose stop frontend-$CURRENT_COLOR
fi

echo "--------------------------------------"
echo "🎉 DEPLOYMENT SUCCESSFUL! Now serving on $TARGET_COLOR."