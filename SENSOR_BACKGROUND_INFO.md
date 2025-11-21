# Background Sensor Tracking

This document explains how sensors now work continuously in the background.

## Changes Made

### 1. **Global Sensor Context** (`context/SensorsContext.tsx`)
   - Created a global context that manages all sensors:
     - Accelerometer
     - GPS/Location (with background tracking)
     - Brightness/Light sensor
     - Screen state monitoring
   - Sensors start automatically when the app launches
   - Sensors continue running even when navigating between screens
   - Sensors remain active when the app goes to background (iOS/Android)

### 2. **Background Location Tracking** (`lib/backgroundTasks.ts`)
   - Implemented `expo-task-manager` for background tasks
   - Location tracking continues even when:
     - App is in background
     - Screen is locked
     - User is on a different screen
   - Shows a persistent notification on Android (required for foreground service)
   - Updates every 10 seconds or when moved 10 meters

### 3. **Audio Context Updated** (`context/AudioContext.tsx`)
   - Audio recording now starts automatically on app launch
   - Continues running throughout the app lifecycle
   - No longer requires manual start/stop from sensors page

### 4. **Permissions Configuration** (`app.json`)
   - **iOS**: Added background modes for location, audio, and fetch
   - **Android**: Added permissions for:
     - `ACCESS_BACKGROUND_LOCATION`
     - `FOREGROUND_SERVICE`
     - `FOREGROUND_SERVICE_LOCATION`
   - Enhanced location permission descriptions

### 5. **Sensors Screen Refactored** (`app/(tabs)/sensors.tsx`)
   - Now consumes data from global contexts
   - No longer manages sensor lifecycle
   - Only responsible for displaying sensor data
   - Toggle switch now controls global sensor state

## How It Works

### When App Opens:
1. `SensorsProvider` wraps the entire app in `app/_layout.tsx`
2. Sensors automatically start collecting data
3. All screens have access to real-time sensor data via `useSensors()` hook

### When App Goes to Background:
1. **Location**: Continues tracking with foreground service (shows notification)
2. **Accelerometer**: Continues collecting data
3. **Audio**: Continues monitoring (iOS background audio mode)
4. **Brightness**: Continues monitoring when app is active

### Toggle Control:
- The switch on the Sensors screen controls the global `sensorsEnabled` state
- When disabled, all sensors stop immediately
- When enabled, all sensors restart automatically

## Usage in Other Screens

Any screen can now access sensor data:

```typescript
import { useSensors } from '@/context/SensorsContext';
import { useAudio } from '@/context/AudioContext';

function MyScreen() {
  const { 
    accelerometerData, 
    location, 
    brightness,
    sensorsEnabled,
    setSensorsEnabled 
  } = useSensors();
  
  const { audioLevel, isRecording } = useAudio();
  
  // Use sensor data anywhere!
}
```

## Important Notes

### iOS:
- User must explicitly grant "Always Allow" location permission
- Background location tracking shows a blue status bar
- Audio must be active for background audio mode to work

### Android:
- Shows a persistent notification when tracking location in background
- User must grant "Allow all the time" for location
- Notification cannot be dismissed while tracking

### Battery Impact:
- Background tracking increases battery usage
- GPS is the most power-intensive sensor
- Consider reducing update frequency for production

## Testing Background Tracking

1. **Start the app** and grant all permissions
2. **Navigate away** from the sensors screen - sensors keep running
3. **Press home button** - app goes to background, sensors continue
4. **Lock the screen** - location tracking continues (shows notification on Android)
5. **Return to app** - all sensor data has been continuously collected

## Troubleshooting

### Location not updating in background:
- Check that background location permission is granted
- On iOS: Settings → App → Location → Always Allow
- On Android: Settings → App → Permissions → Location → Allow all the time

### Sensors stop when screen locks:
- Verify UIBackgroundModes in iOS (should include "location" and "audio")
- Verify FOREGROUND_SERVICE permission on Android

### Audio stops in background (iOS):
- Check that audio recording started successfully
- Verify background audio mode in app.json

## Next Steps for Production

1. **Add data persistence**: Store sensor data in database
2. **Optimize battery**: Reduce update frequency based on activity
3. **Add user controls**: Let users choose which sensors to enable
4. **Data sync**: Upload collected data to server periodically
5. **Smart monitoring**: Pause tracking when device is stationary
