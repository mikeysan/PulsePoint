#!/bin/bash
# ============================================================
# PulsePoint Deployment Script
# ============================================================
# Description:
#   Safely pulls the latest code, clears cache, and restarts
#   the Gunicorn + Nginx stack to apply frontend changes.
# ============================================================

set -e  # Exit on first error

SYSTEMCTL_PATH="$(which systemctl 2>/dev/null || echo /usr/bin/systemctl)"
echo "Using systemctl at: $SYSTEMCTL_PATH"

APP_DIR="/home/masego/apps/PulsePoint"      
GUNICORN_SERVICE="gunicorn-pulsepoint.service"      
NGINX_SERVICE="nginx"

echo "=========================================="
echo "🚀 Starting PulsePoint deployment..."
echo "=========================================="

cd $APP_DIR

# 1️⃣ Fetch latest changes
echo "🔄 Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2️⃣ Clear Python cache
echo "🧹 Clearing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} +

# 3️⃣ Clear Flask template cache (if exists)
if [ -d "backend/app/__pycache__" ]; then
  echo "🧹 Clearing Flask template cache..."
  rm -rf backend/app/__pycache__
fi

# 4️⃣ Clear browser/static cache versioning (optional)
if [ -d "frontend/static" ]; then
  echo "🧼 Refreshing static assets..."
  find frontend/static -type f -exec touch {} +
fi

# 5️⃣ Restart Gunicorn and Nginx
echo "🔁 Restarting Gunicorn and Nginx..."
sudo -n "$SYSTEMCTL_PATH" restart $GUNICORN_SERVICE || {
  echo "ERROR: gunicorn restart failed (exit $?). See deploy.log"
  exit 1
}

sudo -n "$SYSTEMCTL_PATH" restart  $NGINX_SERVICE || {
  echo "ERROR: nginx restart failed (exit $?). See deploy.log"
  exit 1
}

# 6️⃣ Check service status
echo "✅ Checking service statuses..."
sudo -n systemctl status $GUNICORN_SERVICE --no-pager
sudo -n systemctl status $NGINX_SERVICE --no-pager

echo "=========================================="
echo "🎉 Deployment complete!"
echo "Your latest frontend changes are now live."
echo "=========================================="

