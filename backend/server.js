/**
 * VigilX Backend Server
 * Proxies ESP32-CAM video feed and detection data from Flask to React frontend
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 5001;
const FLASK_SERVER = 'http://localhost:5000';

// ============================================
// Middleware Configuration
// ============================================

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check Endpoint
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_SERVER}/api/status`, { timeout: 2000 });
    res.json({
      backend: 'online',
      flask_server: 'online',
      esp32_connected: response.data.source === 'esp32cam',
      detector_ready: response.data.detector_ready,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      backend: 'online',
      flask_server: 'offline',
      esp32_connected: false,
      detector_ready: false,
      error: 'Flask server not reachable',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// MJPEG Video Stream Proxy
// ============================================

app.get('/api/feed', (req, res) => {
  console.log('📹 Starting MJPEG stream proxy...');
  
  axios({
    method: 'GET',
    url: `${FLASK_SERVER}/api/feed`,
    responseType: 'stream',
    timeout: 0, // No timeout for streaming
    headers: {
      'Connection': 'keep-alive'
    }
  })
  .then(response => {
    // Set headers for MJPEG stream
    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    
    // Pipe the stream directly to response
    response.data.pipe(res);
    
    // Handle stream errors
    response.data.on('error', (error) => {
      console.error('❌ Stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).send('Stream error');
      }
    });
    
    // Handle client disconnect
    req.on('close', () => {
      console.log('🔌 Client disconnected from stream');
      response.data.destroy();
    });
  })
  .catch(error => {
    console.error('❌ Failed to connect to Flask stream:', error.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Flask server stream unavailable',
        message: 'Make sure Python Flask server is running on port 5000'
      });
    }
  });
});

// ============================================
// API Proxy Endpoints
// ============================================

// Connect/Disconnect ESP32-CAM
app.post('/api/connect', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/connect`, req.body, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Connect error:', error.message);
    res.status(503).json({
      success: false,
      error: 'Failed to connect to Flask server',
      message: error.message
    });
  }
});

// Get detection status
app.get('/api/status', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_SERVER}/api/status`, {
      timeout: 3000
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Status error:', error.message);
    res.status(503).json({
      source: 'unknown',
      detection_active: false,
      detector_ready: false,
      error: 'Flask server unavailable'
    });
  }
});

// Start/Stop detection
app.post('/api/start_detection', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/start_detection`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

app.post('/api/stop_detection', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/stop_detection`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// Reset statistics
app.post('/api/reset', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/reset`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// Get logs
app.get('/api/logs', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_SERVER}/api/logs`);
    res.json(response.data);
  } catch (error) {
    res.status(503).json([]);
  }
});

// XIAO ESP32C3 endpoints
app.post('/api/set_xiao_ip', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/set_xiao_ip`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

app.post('/api/test_xiao', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/test_xiao`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

app.post('/api/manual_alert', async (req, res) => {
  try {
    const response = await axios.post(`${FLASK_SERVER}/api/manual_alert`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// ============================================
// Fallback Proxy for Any Other /api/* Routes
// ============================================

app.use('/api/*', createProxyMiddleware({
  target: FLASK_SERVER,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(503).json({
      error: 'Flask server unavailable',
      message: 'Make sure Python Flask server is running on port 5000'
    });
  }
}));

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VigilX Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Backend running on: http://localhost:${PORT}`);
  console.log(`🔗 Proxying to Flask: ${FLASK_SERVER}`);
  console.log(`📹 Video stream: http://localhost:${PORT}/api/feed`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
  console.log('\n⚠️  Make sure Python Flask server is running on port 5000');
  console.log('   Run: python app.py\n');
  
  // Test Flask connection on startup
  axios.get(`${FLASK_SERVER}/api/status`, { timeout: 2000 })
    .then(() => {
      console.log('✅ Flask server is online and ready!\n');
    })
    .catch(() => {
      console.log('⚠️  Flask server not detected - start it with: python app.py\n');
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down backend server...');
  process.exit(0);
});
