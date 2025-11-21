import { registerBackgroundFetch, startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/lib/backgroundTasks';
import * as Brightness from 'expo-brightness';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface SensorData {
  x: number;
  y: number;
  z: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
}

interface SensorsContextType {
  // Accelerometer
  accelerometerData: SensorData;
  accelHistoryX: number[];
  accelHistoryY: number[];
  accelHistoryZ: number[];
  
  // Location/GPS
  location: LocationData | null;
  locationPermission: boolean;
  locationHistory: { lat: number; lng: number }[];
  speedHistory: number[];
  locationUpdateCount: number;
  lastLocationUpdate: Date | null;
  
  // Brightness
  brightness: number;
  brightnessHistory: number[];
  
  // Screen state
  screenState: string;
  
  // Controls
  sensorsEnabled: boolean;
  setSensorsEnabled: (enabled: boolean) => void;
}

const SensorsContext = createContext<SensorsContextType | undefined>(undefined);

const MAX_HISTORY_POINTS = 50;

export function SensorsProvider({ children }: { children: React.ReactNode }) {
  // Accelerometer state
  const [accelerometerData, setAccelerometerData] = useState<SensorData>({ x: 0, y: 0, z: 0 });
  const [accelHistoryX, setAccelHistoryX] = useState<number[]>([]);
  const [accelHistoryY, setAccelHistoryY] = useState<number[]>([]);
  const [accelHistoryZ, setAccelHistoryZ] = useState<number[]>([]);
  const accelerometerSubscription = useRef<any>(null);

  // Location state
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [locationHistory, setLocationHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [locationUpdateCount, setLocationUpdateCount] = useState<number>(0);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Brightness state
  const [brightness, setBrightness] = useState<number>(0);
  const [brightnessHistory, setBrightnessHistory] = useState<number[]>([]);
  const brightnessInterval = useRef<any>(null);

  // Screen state
  const [screenState, setScreenState] = useState<string>('active');

  // Controls
  const [sensorsEnabled, setSensorsEnabled] = useState<boolean>(true);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
    getBrightnessLevel();
    
    // Register background tasks
    registerBackgroundFetch();

    // Monitor app state
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setScreenState(nextAppState);
      console.log('App state changed to:', nextAppState);
      
      // Keep sensors running even in background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App went to background, sensors continue running');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Start sensors when enabled
  useEffect(() => {
    if (sensorsEnabled) {
      console.log('Starting all sensors...');
      startAccelerometer();
      startBrightnessMonitoring();
      if (locationPermission) {
        startLocationTracking();
        // Also start background location tracking
        startBackgroundLocationTracking();
      }
    } else {
      console.log('Stopping all sensors...');
      stopAccelerometer();
      stopBrightnessMonitoring();
      stopLocationTracking();
      stopBackgroundLocationTracking();
    }

    return () => {
      stopAccelerometer();
      stopBrightnessMonitoring();
      stopLocationTracking();
      stopBackgroundLocationTracking();
    };
  }, [sensorsEnabled, locationPermission]);

  const requestPermissions = async () => {
    try {
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus === 'granted') {
        // Request background location permission
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        console.log('Location permissions - Foreground:', foregroundStatus, 'Background:', backgroundStatus);
        setLocationPermission(true);
      } else {
        setLocationPermission(false);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setLocationPermission(false);
    }
  };

  // Accelerometer functions
  const startAccelerometer = () => {
    if (accelerometerSubscription.current) {
      console.log('Accelerometer already running');
      return;
    }

    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      
      setAccelHistoryX((prev) => [...prev.slice(-MAX_HISTORY_POINTS + 1), data.x]);
      setAccelHistoryY((prev) => [...prev.slice(-MAX_HISTORY_POINTS + 1), data.y]);
      setAccelHistoryZ((prev) => [...prev.slice(-MAX_HISTORY_POINTS + 1), data.z]);
    });
    
    accelerometerSubscription.current = subscription;
    console.log('Accelerometer started');
  };

  const stopAccelerometer = () => {
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
      console.log('Accelerometer stopped');
    }
  };

  // Location functions
  const startLocationTracking = async () => {
    if (locationSubscription.current) {
      console.log('Location tracking already running');
      return;
    }

    try {
      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      
      const initialData = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        altitude: initialLocation.coords.altitude,
        accuracy: initialLocation.coords.accuracy,
        speed: initialLocation.coords.speed,
      };
      
      setLocation(initialData);
      setLocationHistory([{ 
        lat: initialLocation.coords.latitude, 
        lng: initialLocation.coords.longitude 
      }]);

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0.5,
        },
        (newLocation) => {
          const newLat = newLocation.coords.latitude;
          const newLng = newLocation.coords.longitude;
          
          setLocation({
            latitude: newLat,
            longitude: newLng,
            altitude: newLocation.coords.altitude,
            accuracy: newLocation.coords.accuracy,
            speed: newLocation.coords.speed,
          });
          
          setLocationUpdateCount((prev) => prev + 1);
          setLastLocationUpdate(new Date());
          
          setLocationHistory((prev) => {
            const lastPoint = prev[prev.length - 1];
            if (!lastPoint || lastPoint.lat !== newLat || lastPoint.lng !== newLng) {
              return [...prev.slice(-MAX_HISTORY_POINTS + 1), { lat: newLat, lng: newLng }];
            }
            return prev;
          });
          
          const speedValue = newLocation.coords.speed || 0;
          setSpeedHistory((prev) => [...prev.slice(-MAX_HISTORY_POINTS + 1), speedValue]);
        }
      );

      locationSubscription.current = subscription;
      console.log('Location tracking started');
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      console.log('Location tracking stopped');
    }
  };

  // Brightness functions
  const getBrightnessLevel = async () => {
    try {
      const brightnessLevel = await Brightness.getBrightnessAsync();
      setBrightness(brightnessLevel);
      setBrightnessHistory((prev) => [...prev.slice(-MAX_HISTORY_POINTS + 1), brightnessLevel * 100]);
    } catch (error) {
      console.log('Brightness error:', error);
    }
  };

  const startBrightnessMonitoring = () => {
    if (brightnessInterval.current) {
      console.log('Brightness monitoring already running');
      return;
    }

    brightnessInterval.current = setInterval(() => {
      getBrightnessLevel();
    }, 1000);
    console.log('Brightness monitoring started');
  };

  const stopBrightnessMonitoring = () => {
    if (brightnessInterval.current) {
      clearInterval(brightnessInterval.current);
      brightnessInterval.current = null;
      console.log('Brightness monitoring stopped');
    }
  };

  return (
    <SensorsContext.Provider
      value={{
        accelerometerData,
        accelHistoryX,
        accelHistoryY,
        accelHistoryZ,
        location,
        locationPermission,
        locationHistory,
        speedHistory,
        locationUpdateCount,
        lastLocationUpdate,
        brightness,
        brightnessHistory,
        screenState,
        sensorsEnabled,
        setSensorsEnabled,
      }}
    >
      {children}
    </SensorsContext.Provider>
  );
}

export function useSensors() {
  const context = useContext(SensorsContext);
  if (context === undefined) {
    throw new Error('useSensors must be used within a SensorsProvider');
  }
  return context;
}
