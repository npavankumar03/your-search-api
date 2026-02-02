# 🚀 SearchAPI - Linux Hosting Guide

Complete step-by-step guide to host SearchAPI on your Linux server.

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ (or similar)
- Root or sudo access
- Server IP address (e.g., `192.168.1.100`)

---

## Step 1: Update System & Install Dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git build-essential
```

---

## Step 2: Install Node.js 20.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

---

## Step 3: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 4: Create Application Directory

```bash
# Create app directories
sudo mkdir -p /var/www/searchapi/backend
sudo mkdir -p /var/www/searchapi/frontend
sudo mkdir -p /var/log/searchapi

# Set ownership (replace 'youruser' with your username)
sudo chown -R $USER:$USER /var/www/searchapi
```

---

## Step 5: Upload Files to Server

### Option A: Clone from GitHub

```bash
cd /var/www/searchapi
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

### Option B: Copy from Local Machine

Run on your **local computer**:

```bash
# From your project directory
scp -r backend/* root@YOUR_SERVER_IP:/var/www/searchapi/backend/
```

---

## Step 6: Install Backend Dependencies

```bash
cd /var/www/searchapi/backend

# Install production dependencies
npm install --production

# Test it works
node server.js
# Should show: "SearchAPI backend running on http://0.0.0.0:3001"
# Press Ctrl+C to stop
```

---

## Step 7: Create Systemd Service

This makes the backend start automatically on boot.

```bash
sudo nano /etc/systemd/system/searchapi.service
```

Paste this content:

```ini
[Unit]
Description=SearchAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log

[Install]
WantedBy=multi-user.target
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable searchapi
sudo systemctl start searchapi

# Check status
sudo systemctl status searchapi
```

---

## Step 8: Build Frontend

On your **local computer** in the project folder:

```bash
# Create .env file with your server IP
echo "VITE_API_URL=http://YOUR_SERVER_IP:3001" > .env

# Install dependencies and build
npm install
npm run build

# Upload to server
scp -r dist/* root@YOUR_SERVER_IP:/var/www/searchapi/frontend/
```

---

## Step 9: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/searchapi
```

Paste this configuration (replace `YOUR_SERVER_IP` with your actual IP):

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    # Frontend
    location / {
        root /var/www/searchapi/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Save and exit.

```bash
# Enable site and remove default
sudo ln -sf /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 10: Configure Firewall

```bash
# Allow HTTP and API port
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

---

## Step 11: Test Everything

```bash
# Test backend directly
curl http://localhost:3001/health

# Test search API
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "hello world", "engine": "google"}'

# Test from external (replace with your IP)
curl http://YOUR_SERVER_IP/health
```

---

## 📋 Useful Commands

### Backend Management

```bash
# View backend logs
sudo tail -f /var/log/searchapi/backend.log

# View error logs
sudo tail -f /var/log/searchapi/error.log

# Restart backend
sudo systemctl restart searchapi

# Stop backend
sudo systemctl stop searchapi

# Check backend status
sudo systemctl status searchapi
```

### Nginx Management

```bash
# Restart Nginx
sudo systemctl restart nginx

# Test Nginx config
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 Quick Deploy Script

For subsequent deployments, you can use the included deploy script:

```bash
# From your local machine
./scripts/deploy.sh YOUR_SERVER_IP
```

This will:
1. Copy backend files
2. Copy frontend source
3. Install dependencies
4. Build frontend with correct API URL
5. Configure Nginx
6. Start/restart the backend service

---

## 🌐 API Usage

Once deployed, your API is available at:

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search with JSON body |
| GET | `/search?q=query` | Search with query params |
| GET | `/health` | Health check |

### Example Request

```bash
curl -X POST http://YOUR_SERVER_IP/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best restaurants NYC", "engine": "google"}'
```

### Supported Engines

- `google` (default) - Main search engine
- `duckduckgo` - Privacy-focused
- `bing` - Microsoft search

---

## 🔒 Adding HTTPS (Optional)

For production, add SSL with Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

---

## 🎉 Done!

Your SearchAPI is now live at:

- **Frontend**: `http://YOUR_SERVER_IP`
- **API Endpoint**: `http://YOUR_SERVER_IP/search`
- **Health Check**: `http://YOUR_SERVER_IP/health`
