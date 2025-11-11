
# Health App

A cross-platform health tracking app built with React Native and Expo Router. This app allows users to sign up, log in, and track their health activities. It uses Supabase for backend services and authentication.

## Features
- User authentication (Sign up, Login)
- Health activity tracking
- Modern UI with Expo Router
- Cross-platform: Android, iOS, and Web
- Supabase integration for backend and database
- Persistent sessions and auto-refresh

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/client) app installed on your Android or iOS device (from Google Play or App Store)

### 2. Clone the Repository
```sh
git clone https://github.com/your-username/health-app.git
cd health-app
```

### 3. Install Dependencies
```sh
npm install
```

### 4. Set Up Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note:** Never commit your real `.env` file. Share a `.env.example` with placeholder values for contributors.

---

## Running the App with Expo Go

Expo Go lets you preview and test your app instantly on your mobile device.

### 1. Start the Expo Development Server
```sh
npx expo start
```

### 2. Open the App in Expo Go
- After running the above command, a QR code will appear in your terminal or browser.
- Open the Expo Go app on your phone.
- Scan the QR code to launch the app demo on your device.

---

## Building an APK (Android)

To generate a standalone APK for Android:

1. Make sure you have an Expo account. If not, sign up at [expo.dev](https://expo.dev/).
2. Login to Expo CLI:
   ```sh
   npx expo login
   ```
3. Build the APK:
   ```sh
   npx expo run:android --variant release
   # or for EAS Build (recommended):
   npx eas build -p android --profile preview
   ```
4. Download the APK from the Expo dashboard or the output link provided.

---

## Contributing
1. Fork this repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Need Help?
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- Open an issue in this repository
