#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install any new dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Restart PM2 application
echo "🔄 Restarting application..."
pm2 restart allinone-external

# Show status
echo "📊 Application status:"
pm2 status

echo "✅ Deployment complete!" 