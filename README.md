<div align="center">

# 🚨 VIGILX

### *AI-Powered Driver Drowsiness Detection System*

[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TinyML](https://img.shields.io/badge/TinyML-Edge_AI-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/lite)
[![Twilio](https://img.shields.io/badge/Twilio-SMS_Alerts-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](https://www.twilio.com/)
[![License](https://img.shields.io/badge/License-MIT-8B1538?style=for-the-badge)](LICENSE)

<br/>

<img src="https://img.shields.io/badge/⚡_0.2s-Latency-DB2777?style=flat-square&labelColor=1a1a2e" alt="Latency"/>
<img src="https://img.shields.io/badge/🌐_Works-Offline-DB2777?style=flat-square&labelColor=1a1a2e" alt="Offline"/>
<img src="https://img.shields.io/badge/⏱️_60s-Setup-DB2777?style=flat-square&labelColor=1a1a2e" alt="Setup"/>
<img src="https://img.shields.io/badge/💰_₹399--599-Affordable-DB2777?style=flat-square&labelColor=1a1a2e" alt="Price"/>

<br/><br/>

**150,000 lives are lost to driver fatigue every year.**<br/>
*VIGILX is an affordable, offline drowsiness-detection system for any vehicle, built for Indian roads.*

[🚀 Get Started](#-quick-start) •
[✨ Features](#-features) •
[📖 Documentation](#-documentation) •
[🤝 Contributing](#-contributing)

---

</div>

## 🎯 The Problem

> Every **18 minutes**, someone on Indian roads dies due to a preventable fatigue-related accident.

Driver fatigue kills more than drunk driving. Most drivers don't realize they're drowsy until it's too late. VIGILX uses cutting-edge TinyML technology to detect drowsiness in real-time and alert drivers before accidents happen.

<br/>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 Offline AI Detection
- **TinyML-powered** edge computing
- **0.2 second** detection latency
- Works without internet connectivity
- Processes locally on device

</td>
<td width="50%">

### 🔔 Multi-Modal Alerts
- **Audio alerts** - Loud buzzer sounds
- **Haptic feedback** - Vibration alerts
- **SMS notifications** - Emergency contacts via Twilio
- **Visual warnings** - On-screen indicators

</td>
</tr>
<tr>
<td width="50%">

### 📊 Dual Dashboard Modes

**🏢 Commercial Mode**
- Fleet management dashboard
- Multi-vehicle tracking
- Driver behavior analytics
- Detailed trip reports

</td>
<td width="50%">

**👤 Private Mode**
- Personal driver monitoring
- Simple setup & configuration
- Trip history tracking
- Emergency contact alerts

</td>
</tr>
</table>

### 🎥 Multiple Camera Sources

| Source | Description | Use Case |
|--------|-------------|----------|
| 📹 **Dashcam** | Dedicated dashboard camera | Commercial fleets |
| 📱 **Mobile Camera** | Smartphone camera via QR code | Personal vehicles |
| 🔌 **Device Camera** | Connected IoT device | Enterprise integration |

<br/>

## 🏗️ Tech Stack

<div align="center">

| Frontend | Backend | AI/ML | Notifications |
|:--------:|:-------:|:-----:|:-------------:|
| ![React](https://img.shields.io/badge/-React_19-61DAFB?style=flat-square&logo=react&logoColor=black) | ![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | ![TensorFlow](https://img.shields.io/badge/-TinyML-FF6F00?style=flat-square&logo=tensorflow&logoColor=white) | ![Twilio](https://img.shields.io/badge/-Twilio-F22F46?style=flat-square&logo=twilio&logoColor=white) |
| ![React Router](https://img.shields.io/badge/-React_Router_7-CA4245?style=flat-square&logo=react-router&logoColor=white) | ![Express](https://img.shields.io/badge/-Express.js-000000?style=flat-square&logo=express&logoColor=white) | ![Edge AI](https://img.shields.io/badge/-Edge_AI-00599C?style=flat-square&logo=intel&logoColor=white) | ![SMS](https://img.shields.io/badge/-SMS_API-25D366?style=flat-square&logo=whatsapp&logoColor=white) |
| ![Framer Motion](https://img.shields.io/badge/-Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white) | ![SQLite](https://img.shields.io/badge/-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) | | |

</div>

<br/>

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Twilio account** (for SMS alerts - optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vigilx.git
cd vigilx

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Twilio credentials
```

### Running the Application

```bash
# Option 1: Run both frontend and backend concurrently
npm run dev

# Option 2: Run separately
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
npm start
```

### Access the Application

| Service | URL |
|---------|-----|
| 🌐 Frontend | [http://localhost:3000](http://localhost:3000) |
| 🔧 Backend API | [http://localhost:5000](http://localhost:5000) |
| 💚 Health Check | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

<br/>

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000

# Twilio Configuration (for SMS alerts)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

<br/>

## 📁 Project Structure

```
vigilx/
├── 📂 src/                     # React frontend source
│   ├── 📂 components/
│   │   ├── 📂 Commercial/      # Commercial dashboard components
│   │   ├── 📂 Private/         # Private dashboard components
│   │   ├── 📂 Simulation/      # Alert simulation tools
│   │   ├── 📄 LandingPage.jsx  # Main landing page
│   │   └── 📄 LivesSavedCounter.jsx
│   ├── 📂 styles/              # CSS stylesheets
│   ├── 📂 hooks/               # Custom React hooks
│   └── 📂 utils/               # Utility functions
│
├── 📂 backend/                 # Node.js backend
│   ├── 📂 config/              # Configuration files
│   ├── 📂 database/            # SQLite database setup
│   ├── 📂 middleware/          # Express middleware
│   ├── 📂 routes/              # API routes
│   ├── 📂 services/            # Business logic services
│   └── 📄 server.js            # Main server entry
│
├── 📂 public/                  # Static assets
│   └── 📂 assets/              # Videos and images
│
└── 📄 package.json             # Project configuration
```

<br/>

## 📖 Documentation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/send-sms` | Send drowsiness alert SMS |
| `POST` | `/api/test-sms` | Send test SMS |
| `GET` | `/api/contacts` | List emergency contacts |
| `POST` | `/api/contacts` | Add emergency contact |
| `GET` | `/api/simulation/*` | Simulation endpoints |

### How It Works

```mermaid
graph LR
    A[📹 Camera Feed] --> B[🧠 TinyML Model]
    B --> C{Drowsiness Detected?}
    C -->|Yes| D[🔔 Audio Alert]
    C -->|Yes| E[📱 SMS Alert]
    C -->|Yes| F[📊 Log Event]
    C -->|No| A
```

<br/>

## 📊 Impact Statistics

<div align="center">

| Metric | Value |
|:------:|:-----:|
| 🚗 Preventable deaths annually | **1,50,000** |
| ⚠️ Fatal accidents linked to fatigue | **30%** |
| 💰 Economic impact | **₹1.08L Crore** |

</div>

<br/>

## 🤝 Contributing

We love contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

```bash
# Fork the repository
# Create your feature branch
git checkout -b feature/AmazingFeature

# Commit your changes
git commit -m 'Add some AmazingFeature'

# Push to the branch
git push origin feature/AmazingFeature

# Open a Pull Request
```

<br/>

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<br/>

## 🙏 Acknowledgments

- Built for Indian roads and drivers
- Inspired by the mission to reduce road fatalities
- Thanks to the open-source community

<br/>

---

<div align="center">

### 🛡️ Making Every Journey Safer

<br/>

**VIGILX** — *Keeping Indian roads safer, one driver at a time.*

<br/>

[![Made with ❤️](https://img.shields.io/badge/Made_with-❤️-8B1538?style=for-the-badge)](https://github.com/yourusername/vigilx)
[![Built for 🇮🇳](https://img.shields.io/badge/Built_for-🇮🇳_India-FF9933?style=for-the-badge)](https://github.com/yourusername/vigilx)

<br/>

⭐ **Star this repo if VIGILX helps save lives!** ⭐

</div>#   V i g i l X  
 #   V i g i l X  
 