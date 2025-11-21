# Expense Tracker App

A cross-platform mobile application built with React Native, Expo, and TypeScript for tracking personal expenses with a clean and intuitive interface.

## Features

- Add, edit, and delete expenses
- Categorize expenses
- View expense history
- Responsive design for both iOS and Android
- Offline support with local data persistence

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (for emulator/simulator) or Expo Go app (for physical device)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/PrinceKex/expense-tracker-assessment.git
cd expense-tracker-assessment
```

### 2. Install Dependencies

```bash
# Navigate to the mobile directory
cd mobile

# Install dependencies
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a `.env` file in the `mobile` directory with the following variables:

```env
EXPO_PUBLIC_API_URL=your_api_url_here
# Add any other environment variables needed
```

### 4. Start the Development Server

```bash
# From the mobile directory
npx expo start
```

This will start the Metro bundler and present you with options to run the app.

## Running the App

### Using a Physical Device

1. Install the Expo Go app on your iOS or Android device
2. Scan the QR code shown in the terminal or in the Expo Dev Tools
3. The app will load in the Expo Go app

### Using an Emulator/Simulator

#### Android

1. Make sure you have an Android emulator set up through Android Studio
2. Press `a` in the terminal where Expo is running to open the app in the Android emulator

#### iOS (macOS only)

1. Make sure you have Xcode installed
2. Press `i` in the terminal where Expo is running to open the app in the iOS Simulator

## Available Scripts

- `npm start` or `yarn start` - Starts the development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in a web browser
- `npm test` - Run tests

## Project Structure

```
mobile/
├── app/                  # Main application code
│   ├── (app)/            # Authenticated app screens
│   ├── (auth)/           # Authentication screens
│   ├── _layout.tsx       # Root layout
│   └── index.tsx         # Entry point
├── assets/               # Images, fonts, etc.
├── components/           # Reusable components
├── constants/            # App constants
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── services/             # API services
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
