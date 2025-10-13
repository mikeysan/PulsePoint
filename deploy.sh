#!/bin/bash
# ============================================================
# PulsePoint Deployment Script (Secure Setup)
# ============================================================
# Description:
#   Safely pulls the latest code, updates dependencies,
#   clears cache, copies static files, and restarts services.
# ============================================================

set -e  # Exit on first error

# Configuration
APP_DIR="/opt/webapps/pulsepoint"
STATIC_DIR="/var/www/pulsepoint/static"
GUNICORN_SERVICE="gunicorn-pulsepoint.service"
NGINX_SERVICE="nginx"
APP_USER="pulsepoint"

echo "=========================================="
echo "🚀 Starting PulsePoint deployment..."
echo "=========================================="

# Must run as masego (deploy user)
if [ "$USER" != "masego" ]; then
    echo "❌ This script must run as masego"
    exit 1
fi

cd $APP_DIR

# 1️⃣ Fetch latest changes
echo "🔄 Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2️⃣ Update dependencies
echo "📦 Updating Python dependencies..."
source venv/bin/activate
pip install -r backend/requirements.txt --quiet --upgrade
deactivate

# 3️⃣ Copy static files to web directory
echo "📁 Updating static files..."
sudo cp -r frontend/static/* $STATIC_DIR/
sudo chown -R $APP_USER:www-data $STATIC_DIR
sudo find $STATIC_DIR -type d -exec chmod 755 {} \;
sudo find $STATIC_DIR -type f -exec chmod 644 {} \;

# 4️⃣ Clear Python cache
echo "🧹 Clearing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# 5️⃣ Fix ownership (ensure app user owns everything)
echo "🔒 Setting permissions..."
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chown masego:pulsepoint $APP_DIR  # Allow masego to deploy
sudo chmod 770 $APP_DIR

# 6️⃣ Restart services
echo "🔁 Restarting Gunicorn..."
sudo systemctl restart $GUNICORN_SERVICE || {
  echo "❌ ERROR: Gunicorn restart failed"
  sudo journalctl -u $GUNICORN_SERVICE -n 20 --no-pager
  exit 1
}

echo "🔁 Reloading Nginx..."
sudo systemctl reload $NGINX_SERVICE || {
  echo "❌ ERROR: Nginx reload failed"
  sudo journalctl -u $NGINX_SERVICE -n 20 --no-pager
  exit 1
}

# 7️⃣ Verify services
echo "✅ Verifying services..."
sleep 2

if systemctl is-active --quiet $GUNICORN_SERVICE; then
    echo "✅ Gunicorn is running"
else
    echo "❌ Gunicorn failed to start!"
    sudo journalctl -u $GUNICORN_SERVICE -n 30 --no-pager
    exit 1
fi

if systemctl is-active --quiet $NGINX_SERVICE; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start!"
    exit 1
fi

# 8️⃣ Show recent logs
echo ""
echo "📋 Recent Gunicorn logs:"
sudo tail -10 /var/log/webapps/pulsepoint/error.log

echo ""
echo "=========================================="
echo "🎉 Deployment complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test locally: curl -k https://localhost/api/health"
echo "  2. Test live: https://pulsepoint.whoismikey.net"
echo "  3. Check logs: sudo journalctl -u $GUNICORN_SERVICE -f"
echo ""
