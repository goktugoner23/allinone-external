# DigitalOcean Deployment Guide

## Prerequisites
- DigitalOcean account
- Domain name (optional but recommended)

## Step 1: Create Droplet
1. Create a new Ubuntu 22.04 droplet (minimum $6/month)
2. Choose a datacenter region close to you
3. Add your SSH key
4. Note the static IP address assigned

## Step 2: Server Setup
```bash
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
apt install -y nginx

# Install Git
apt install -y git
```

## Step 3: Deploy Application
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/allinone-external.git
cd allinone-external

# Install dependencies
npm install

# Build the application
npm run build

# Set environment variables
nano .env
```

Add to .env:
```
NODE_ENV=production
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
PORT=3000
```

## Step 4: Configure PM2
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Content:
```javascript
module.exports = {
  apps: [{
    name: 'allinone-external',
    script: 'dist/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 5: Configure Nginx
```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/allinone-external
```

Content:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/allinone-external /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Enable Nginx to start on boot
systemctl enable nginx
```

## Step 6: Setup SSL (Optional but Recommended)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com

# Test auto-renewal
certbot renew --dry-run
```

## Step 7: Configure Firewall
```bash
# Setup UFW firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

## Step 8: Update Binance IP Whitelist
Add your DigitalOcean droplet's static IP to Binance API whitelist.

## Step 9: Test Deployment
```bash
# Check if application is running
pm2 status

# View logs
pm2 logs allinone-external

# Test API endpoints
curl http://YOUR_DROPLET_IP/health
curl http://YOUR_DROPLET_IP/api/binance/account
```

## Maintenance Commands
```bash
# Update application
cd /root/allinone-external
git pull
npm run build
pm2 restart allinone-external

# View logs
pm2 logs allinone-external

# Monitor resources
pm2 monit
```

## Environment Variables on DigitalOcean
Unlike Heroku, you'll manage environment variables through:
1. `.env` file (for development)
2. PM2 ecosystem file (for production)
3. System environment variables

Your static IP will remain the same unless you destroy and recreate the droplet. 