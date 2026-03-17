# VigilX Backend Server

Node.js proxy server for ESP32-CAM live feed integration.

## Installation

```bash
cd backend
npm install
```

## Usage

### Start the backend server:
```bash
npm start
```

### Development mode (with auto-reload):
```bash
npm run dev
```

The server will run on `http://localhost:5001`

## Prerequisites

Make sure the Python Flask server is running:
```bash
python app.py
```

The Flask server should be running on `http://localhost:5000`

## Endpoints

- `GET /api/health` - Health check and Flask server status
- `GET /api/feed` - MJPEG video stream (proxied from Flask)
- `POST /api/connect` - Connect/disconnect ESP32-CAM
- `GET /api/status` - Get detection status and statistics
- `POST /api/start_detection` - Start drowsiness detection
- `POST /api/stop_detection` - Stop drowsiness detection
- `POST /api/reset` - Reset detection statistics

## Architecture

```
ESP32-CAM → Flask Server (5000) → Node.js Backend (5001) → React Frontend (3000)
```

The Node.js backend acts as a proxy, forwarding:
- MJPEG video stream
- Detection data (EAR, MAR, blinks, yawns)
- Connection/control commands

## Troubleshooting

**Backend starts but shows Flask offline:**
- Make sure Python Flask server is running: `python app.py`
- Check Flask is on port 5000

**Video stream not working:**
- Verify ESP32-CAM is connected to Flask
- Check browser console for errors
- Test stream directly: `http://localhost:5001/api/feed`

**CORS errors:**
- Backend has CORS enabled by default
- React proxy is configured in package.json
