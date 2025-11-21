# Expense Tracker App

A full-stack expense tracking application with React Native mobile app and Node.js backend.

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo Go app (for mobile testing)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/PrinceKex/expense-tracker-assessment.git
cd expense-tracker-assessment
```

### 2. Backend Setup

```bash
# Install dependencies
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Start the backend server
npm run dev
# Server runs on http://localhost:3000
```

### 3. Mobile App Setup

```bash
# In a new terminal
cd ../mobile
npm install

# Configure API URL (use your computer's IP if testing on a physical device)
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env

# Start the mobile app
npx expo start
```

## Running the App

1. **Backend**: Should be running at `http://localhost:3000`
2. **Mobile**:
   - **Physical Device**: Scan QR code with Expo Go app
   - **Android Emulator**: Press `a` in the terminal
   - **iOS Simulator**: Press `i` in the terminal (macOS only)

## Environment Variables

### Backend (`.env` in backend/)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_secure_secret
```

> **Note**: The app uses SQLite by default, so no separate database server is needed.

### Mobile (`.env` in mobile/)
```
# Use your computer's IP address if testing on a physical device
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Need Help?

- Backend API docs: `http://localhost:3000/api-docs`
- For issues, check the [issues page](https://github.com/PrinceKex/expense-tracker-assessment/issues)
├── services/             # API services
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

