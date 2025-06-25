# Deployment Setup Guide

This guide explains how to set up sensitive configuration files on your DigitalOcean droplet after pushing the code.

## 🚀 Deployment Steps

### 1. Push Clean Code to Repository
```bash
git add .
git commit -m "Complete Instagram integration with data persistence fix"
git push origin main
```

### 2. SSH into DigitalOcean Droplet
```bash
ssh root@129.212.143.6
```

### 3. Pull Latest Code
```bash
cd /path/to/your/app  # Navigate to your app directory
git pull origin main
npm install  # Install any new dependencies
```

### 4. Create Environment Variables File

Create the `.env` file with your actual values:

```bash
nano .env
```

Add the following content:
```env
# Instagram Configuration
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_USER_ID=your_instagram_user_id_here
INSTAGRAM_APP_ID=your_instagram_app_id_here

# Facebook Configuration
FACEBOOK_GRAPH_TOKEN=your_facebook_graph_token_here
FACEBOOK_PAGE_ACCESS_TOKEN=your_facebook_page_access_token_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json

# RAG System Configuration
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_pinecone_index_name_here

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGIN=*
```

### 5. Create Firebase Service Account File

Create the Firebase service account JSON file:

```bash
nano firebase-service-account.json
```

Add your Firebase service account JSON content (get this from Firebase Console):
```json
{
  "type": "service_account",
  "project_id": "your_firebase_project_id",
  "private_key_id": "your_private_key_id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "your_service_account_email@your_project_id.iam.gserviceaccount.com",
  "client_id": "your_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your_cert_url"
}
```

### 6. Create Google Services File (if needed)

Create the Google services file:

```bash
nano google-services.json
```

Add your Google services configuration.

### 7. Set File Permissions

```bash
chmod 600 .env
chmod 600 firebase-service-account.json
chmod 600 google-services.json
```

### 8. Update PM2 Ecosystem Configuration

Edit the ecosystem.config.js file with production settings:

```bash
nano ecosystem.config.js
```

Make sure it looks like this:
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
};
```

### 9. Build and Deploy

```bash
# Build the TypeScript project
npm run build

# Restart PM2 application
pm2 restart allinone-external

# Check status
pm2 status
pm2 logs allinone-external --lines 50
```

### 10. Verify Deployment

Test that everything is working:

```bash
# Check if the server is responding
curl http://localhost:3000/health

# Check PM2 status
pm2 status

# Check logs for any errors
pm2 logs allinone-external --lines 20
```

## 🔒 Security Notes

1. **Never commit sensitive files** to the repository
2. **Files are already in `.gitignore`**:
   - `.env`
   - `firebase-service-account.json`
   - `google-services.json`
   - `ecosystem.config.js`

3. **File permissions** should be set to 600 (owner read/write only)
4. **Backup your sensitive files** securely outside of the repository

## 🚨 Important Files to Create on Server

These files must be created manually on the DigitalOcean droplet:

- ✅ `.env` - Environment variables
- ✅ `firebase-service-account.json` - Firebase credentials  
- ✅ `google-services.json` - Google services config
- ✅ `ecosystem.config.js` - PM2 configuration

## 📞 Support

If you encounter any issues during deployment, check:

1. **PM2 logs**: `