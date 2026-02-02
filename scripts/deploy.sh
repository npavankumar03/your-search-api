#!/bin/bash
# deploy.sh - Full deployment script for Linux VM
# Usage: ./deploy.sh YOUR_SERVER_IP
set -e

SERVER_IP="${1:-YOUR_SERVER_IP}"

if [ "$SERVER_IP" == "YOUR_SERVER_IP" ]; then
    echo "Usage: ./deploy.sh <your-server-ip>"
    echo "Example: ./deploy.sh 192.168.1.100"
    exit 1
fi

echo "=== SearchAPI Deployment to $SERVER_IP ==="

# Configuration
APP_DIR="/var/www/searchapi"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo ""
echo "Step 1: Creating directories on server..."
ssh root@$SERVER_IP "mkdir -p $BACKEND_DIR $FRONTEND_DIR /var/log/searchapi"

echo ""
echo "Step 2: Copying backend files..."
scp -r ./backend/* root@$SERVER_IP:$BACKEND_DIR/

echo ""
echo "Step 3: Copying frontend source files..."
scp -r ./src ./public ./index.html ./package.json ./vite.config.ts ./tailwind.config.ts ./tsconfig*.json ./components.json ./postcss.config.js root@$SERVER_IP:$FRONTEND_DIR/

echo ""
echo "Step 4: Installing backend dependencies..."
ssh root@$SERVER_IP "cd $BACKEND_DIR && npm install --production"

echo ""
echo "Step 5: Building frontend..."
ssh root@$SERVER_IP "cd $FRONTEND_DIR && echo 'VITE_API_URL=http://$SERVER_IP:3001' > .env && npm install && npm run build"

echo ""
echo "Step 6: Configuring Nginx..."
ssh root@$SERVER_IP "cat > /etc/nginx/sites-available/searchapi << 'NGINX'
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        root /var/www/searchapi/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
NGINX"

ssh root@$SERVER_IP "ln -sf /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/"
ssh root@$SERVER_IP "rm -f /etc/nginx/sites-enabled/default"
ssh root@$SERVER_IP "nginx -t && systemctl reload nginx"

echo ""
echo "Step 7: Creating and starting backend service..."
ssh root@$SERVER_IP "cat > /etc/systemd/system/searchapi-backend.service << 'SYSTEMD'
[Unit]
Description=SearchAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=3001
Environment=NODE_ENV=production
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log

[Install]
WantedBy=multi-user.target
SYSTEMD"

ssh root@$SERVER_IP "systemctl daemon-reload && systemctl enable searchapi-backend && systemctl restart searchapi-backend"

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Frontend: http://$SERVER_IP"
echo "API:      http://$SERVER_IP:3001/search"
echo ""
echo "Test the API:"
echo "  curl -X POST http://$SERVER_IP:3001/search -H 'Content-Type: application/json' -d '{\"query\": \"hello world\"}'"
echo ""
echo "Check logs:"
echo "  ssh root@$SERVER_IP 'tail -f /var/log/searchapi/backend.log'"
