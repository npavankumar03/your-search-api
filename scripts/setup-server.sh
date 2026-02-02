#!/bin/bash
# setup-server.sh - One-time server setup
# Run this ON your Linux VM first
set -e

echo "=== SearchAPI Server Setup ==="
echo ""

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Nginx and Git
echo "Installing Nginx and Git..."
apt install -y nginx git

# Create directories
echo "Creating application directories..."
mkdir -p /var/www/searchapi/{backend,frontend}
mkdir -p /var/log/searchapi

# Configure firewall
echo "Configuring firewall..."
ufw allow 80/tcp
ufw allow 3001/tcp
ufw allow 22/tcp
ufw --force enable

# Verify installations
echo ""
echo "=== Installation Complete ==="
echo ""
echo "Installed versions:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Nginx: $(nginx -v 2>&1)"
echo ""
echo "Next steps:"
echo "  1. From your local machine, run: ./scripts/deploy.sh YOUR_SERVER_IP"
echo "  2. Or manually copy files and configure"
echo ""
