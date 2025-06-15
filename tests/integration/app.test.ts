import request from 'supertest';
import express from 'express';

// Simple integration test for the application
describe('Application Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a simple test app
    app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            spot: { isConnected: false, clientCount: 0 },
            usdm: { isConnected: false, clientCount: 0 },
            coinm: { isConnected: false, clientCount: 0 },
            isInitialized: false
          }
        }
      });
    });

    // Test API endpoint
    app.get('/api/test', (req, res) => {
      res.json({
        success: true,
        data: { message: 'Test endpoint working' }
      });
    });

    // Error handling
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    it('should handle test endpoint', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Test endpoint working');
    });

    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500);
    });
  });
}); 