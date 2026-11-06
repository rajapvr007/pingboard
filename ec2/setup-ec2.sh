#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Setting up PingBoard on EC2 (Ubuntu 22.04/24.04)"
echo "=================================================="

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Git, Curl, Nginx, and build essentials
sudo apt install -y git curl nginx build-essential

# 3. Install Node.js 20.x LTS via NodeSource
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PM2 process manager globally
sudo npm install -g pm2

# 5. Create app directory if not already inside it
APP_DIR="/var/www/pingboard"
if [ "$PWD" != "$APP_DIR" ]; then
    echo "Creating deployment directory at $APP_DIR..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
fi

# 6. Install dependencies and build project
echo "Installing monorepo dependencies..."
npm install

echo "Building all workspaces (Shared, Express API, and React Web)..."
npm run build

# 7. Configure Nginx
echo "Configuring Nginx..."
sudo cp ec2/nginx.conf /etc/nginx/sites-available/pingboard
sudo ln -sf /etc/nginx/sites-available/pingboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 8. Start Express API with PM2
echo "Starting Express API with PM2..."
mkdir -p logs
pm2 start ec2/ecosystem.config.cjs
pm2 save

# 9. Enable PM2 on system boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "=================================================="
echo "✅ PingBoard deployed successfully on EC2!"
echo "Public URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo 'YOUR_EC2_PUBLIC_IP')"
echo "=================================================="
