import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Audio } from 'expo-av';
import * as Brightness from 'expo-brightness';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { AppState, Dimensions, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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

interface HistoricalData {
  timestamp: number;
  value: number;
}

const MAX_HISTORY_POINTS = 50; // Keep last 50 data points
const screenWidth = Dimensions.get('window').width;

export default function SensorsScreen() {
  // Accelerometer
  const [accelerometerData, setAccelerometerData] = useState<SensorData>({ x: 0, y: 0, z: 0 });
  const [accelerometerSubscription, setAccelerometerSubscription] = useState<any>(null);
  
  // Historical data for graphs
  const [accelHistoryX, setAccelHistoryX] = useState<number[]>([]);
  const [accelHistoryY, setAccelHistoryY] = useState<number[]>([]);
  const [accelHistoryZ, setAccelHistoryZ] = useState<number[]>([]);
  const [audioHistory, setAudioHistory] = useState<number[]>([]);
  const [brightnessHistory, setBrightnessHistory] = useState<number[]>([]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [locationHistory, setLocationHistory] = useState<{lat: number, lng: number}[]>([]);

  // GPS/Location
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [locationUpdateCount, setLocationUpdateCount] = useState<number>(0);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

  // Microphone (Audio Level)
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Light Sensor (via Brightness)
  const [brightness, setBrightness] = useState<number>(0);

  // Screen State
  const [screenState, setScreenState] = useState<string>('active');

  // Proximity (not directly available in Expo, using Device info as placeholder)
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // Toggle sensors on/off
  const [sensorsEnabled, setSensorsEnabled] = useState<boolean>(true);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
    getDeviceInfo();
    getBrightnessLevel();

    // Monitor app state for screen on/off
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setScreenState(nextAppState);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Accelerometer
  useEffect(() => {
    if (sensorsEnabled) {
      _subscribe();
    } else {
      _unsubscribe();
    }
    return () => _unsubscribe();
  }, [sensorsEnabled]);

  // Location tracking
  useEffect(() => {
    if (sensorsEnabled && locationPermission) {
      startLocationTracking();
    }
  }, [sensorsEnabled, locationPermission]);

  // Audio monitoring - auto start
  useEffect(() => {
    let mounted = true;
    
    const setupAudio = async () => {
      if (sensorsEnabled && audioPermission && !isRecording && mounted) {
        await startRecording();
      }
    };
    
    setupAudio();
    
    return () => {
      mounted = false;
      if (recording) {
        stopRecording();
      }
    };
  }, [sensorsEnabled, audioPermission]);

  // Brightness monitoring
  useEffect(() => {
    if (sensorsEnabled) {
      const interval = setInterval(() => {
        getBrightnessLevel();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sensorsEnabled]);

  const requestPermissions = async () => {
    // Location permission
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus === 'granted');

    // Audio permission
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    setAudioPermission(audioStatus === 'granted');
  };

  const getDeviceInfo = async () => {
    const info = `${Device.modelName || 'Unknown'} - ${Device.osName} ${Device.osVersion}`;
    setDeviceInfo(info);
  };

  const getBrightnessLevel = async () => {
    try {
      const brightnessLevel = await Brightness.getBrightnessAsync();
      setBrightness(brightnessLevel);
      
      // Update history
      setBrightnessHistory(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), brightnessLevel * 100]);
    } catch (error) {
      console.log('Brightness error:', error);
    }
  };

  // Accelerometer functions
  const _subscribe = () => {
    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((accelerometerData) => {
      setAccelerometerData(accelerometerData);
      
      // Update history
      setAccelHistoryX(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), accelerometerData.x]);
      setAccelHistoryY(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), accelerometerData.y]);
      setAccelHistoryZ(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), accelerometerData.z]);
    });
    setAccelerometerSubscription(subscription);
  };

  const _unsubscribe = () => {
    accelerometerSubscription && accelerometerSubscription.remove();
    setAccelerometerSubscription(null);
  };

  // Location functions
  const startLocationTracking = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
      });
      
      // Add initial location to history
      setLocationHistory([{ lat: location.coords.latitude, lng: location.coords.longitude }]);

      // Watch position for live updates
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500, // Update more frequently (500ms)
          distanceInterval: 0.5, // Trigger on 0.5 meter movement (more sensitive)
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
          
          // Track update count and timestamp
          setLocationUpdateCount(prev => prev + 1);
          setLastLocationUpdate(new Date());
          
          // Only add to history if location actually changed
          setLocationHistory(prev => {
            const lastPoint = prev[prev.length - 1];
            if (!lastPoint || lastPoint.lat !== newLat || lastPoint.lng !== newLng) {
              return [...prev.slice(-MAX_HISTORY_POINTS + 1), { lat: newLat, lng: newLng }];
            }
            return prev;
          });
          
          // Update speed history
          const speedValue = newLocation.coords.speed || 0;
          setSpeedHistory(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), speedValue]);
        }
      );
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  // Audio recording for microphone monitoring
  const startRecording = async () => {
    try {
      if (!audioPermission) {
        console.log('Audio permission not granted');
        return;
      }
      
      // If already recording, don't start again
      if (recording || isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            // Normalize metering value (typically -160 to 0)
            const normalized = Math.max(0, Math.min(100, (status.metering + 160) / 1.6));
            setAudioLevel(normalized);
            
            // Update audio history
            setAudioHistory(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), normalized]);
          }
        },
        100 // Update interval in ms
      );

      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.log('Note: Audio monitoring may have limitations on this device');
      // Don't show error to user since monitoring still works
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log('No recording to stop');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
      setAudioLevel(0);
      console.log('Recording stopped successfully');
    } catch (error) {
      console.log('Note: Recording cleanup completed');
      // Clear state anyway
      setRecording(null);
      setIsRecording(false);
      setAudioLevel(0);
    }
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#1E2923',
    backgroundGradientFrom: '#08130D',
    backgroundGradientTo: '#1E3A28',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: '#1aff92',
    },
  };

  const renderLineChart = (data: number[], label: string, color: string) => {
    if (data.length < 2) {
      return (
        <ThemedText style={styles.infoText}>Collecting data...</ThemedText>
      );
    }

    const chartData = {
      labels: data.map((_, i) => i % 10 === 0 ? `${i}` : ''),
      datasets: [
        {
          data: data.length > 0 ? data : [0],
          color: (opacity = 1) => color,
          strokeWidth: 2,
        },
      ],
      legend: [label],
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 64}
        height={180}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => color,
        }}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={true}
        withVerticalLabels={false}
        withHorizontalLabels={true}
      />
    );
  };

  const renderMagnitudeChart = () => {
    if (accelHistoryX.length < 2) {
      return <ThemedText style={styles.infoText}>Collecting data...</ThemedText>;
    }

    const magnitude = accelHistoryX.map((x, i) => {
      const y = accelHistoryY[i] || 0;
      const z = accelHistoryZ[i] || 0;
      return Math.sqrt(x * x + y * y + z * z);
    });

    return renderLineChart(magnitude, 'Magnitude', 'rgba(255, 99, 132, 1)');
  };

  const renderAudioWaveform = () => {
    if (audioHistory.length < 2) {
      return <ThemedText style={styles.infoText}>Start monitoring to see waveform...</ThemedText>;
    }

    return (
      <View style={styles.waveformContainer}>
        {audioHistory.slice(-30).map((level, index) => (
          <View
            key={index}
            style={[
              styles.waveformBar,
              {
                height: Math.max(4, (level / 100) * 80),
                backgroundColor: `rgba(75, 192, 192, ${0.3 + (level / 100) * 0.7})`,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderBrightnessGradient = () => {
    return (
      <View style={styles.brightnessBar}>
        <View
          style={[
            styles.brightnessFill,
            {
              width: `${brightness * 100}%`,
              backgroundColor: `rgba(255, 206, 86, ${0.3 + brightness * 0.7})`,
            },
          ]}
        />
      </View>
    );
  };

  const renderLocationTrail = () => {
    if (locationHistory.length < 2) {
      return <ThemedText style={styles.infoText}>Moving to track location trail...</ThemedText>;
    }

    const minLat = Math.min(...locationHistory.map(l => l.lat));
    const maxLat = Math.max(...locationHistory.map(l => l.lat));
    const minLng = Math.min(...locationHistory.map(l => l.lng));
    const maxLng = Math.max(...locationHistory.map(l => l.lng));
    
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;

    return (
      <View style={styles.mapContainer}>
        {locationHistory.map((loc, index) => {
          const x = ((loc.lng - minLng) / lngRange) * 100;
          const y = ((loc.lat - minLat) / latRange) * 100;
          
          return (
            <View
              key={index}
              style={[
                styles.mapDot,
                {
                  left: `${x}%`,
                  bottom: `${y}%`,
                  opacity: 0.3 + (index / locationHistory.length) * 0.7,
                  backgroundColor: index === locationHistory.length - 1 ? '#ff0000' : '#0099ff',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <ThemedText type="title" style={styles.title}>Sensor Data</ThemedText>
        
        <View style={styles.toggleContainer}>
          <ThemedText>Enable Sensors</ThemedText>
          <Switch
            value={sensorsEnabled}
            onValueChange={setSensorsEnabled}
          />
        </View>

        {/* Accelerometer */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>📱 Accelerometer</ThemedText>
          
          {/* Current Values */}
          <View style={styles.dataRow}>
            <ThemedText style={styles.label}>X-axis:</ThemedText>
            <ThemedText style={styles.value}>{accelerometerData.x.toFixed(4)}</ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.label}>Y-axis:</ThemedText>
            <ThemedText style={styles.value}>{accelerometerData.y.toFixed(4)}</ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.label}>Z-axis:</ThemedText>
            <ThemedText style={styles.value}>{accelerometerData.z.toFixed(4)}</ThemedText>
          </View>
          
          {/* Magnitude Graph */}
          <ThemedText style={styles.chartTitle}>Movement Magnitude</ThemedText>
          {renderMagnitudeChart()}
          
          {/* Individual Axis Charts */}
          <ThemedText style={styles.chartTitle}>X-Axis History</ThemedText>
          {renderLineChart(accelHistoryX, 'X-Axis', 'rgba(255, 99, 132, 1)')}
          
          <ThemedText style={styles.chartTitle}>Y-Axis History</ThemedText>
          {renderLineChart(accelHistoryY, 'Y-Axis', 'rgba(54, 162, 235, 1)')}
          
          <ThemedText style={styles.chartTitle}>Z-Axis History</ThemedText>
          {renderLineChart(accelHistoryZ, 'Z-Axis', 'rgba(75, 192, 192, 1)')}
        </View>

        {/* GPS/Location */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>🌍 GPS Location</ThemedText>
          {locationPermission ? (
            location ? (
              <>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.label}>Latitude:</ThemedText>
                  <ThemedText style={styles.value}>{location.latitude.toFixed(6)}</ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.label}>Longitude:</ThemedText>
                  <ThemedText style={styles.value}>{location.longitude.toFixed(6)}</ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.label}>Altitude:</ThemedText>
                  <ThemedText style={styles.value}>
                    {location.altitude ? `${location.altitude.toFixed(2)} m` : 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.label}>Accuracy:</ThemedText>
                  <ThemedText style={styles.value}>
                    {location.accuracy ? `${location.accuracy.toFixed(2)} m` : 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.dataRow}>
                  <ThemedText style={styles.label}>Speed:</ThemedText>
                  <ThemedText style={styles.value}>
                    {location.speed ? `${location.speed.toFixed(2)} m/s` : '0.00 m/s'}
                  </ThemedText>
                </View>
                
                {/* GPS Status Info */}
                <View style={styles.statusContainer}>
                  <ThemedText style={styles.statusText}>
                    📡 Updates: {locationUpdateCount} | Points: {locationHistory.length}
                  </ThemedText>
                  {lastLocationUpdate && (
                    <ThemedText style={styles.statusText}>
                      Last: {lastLocationUpdate.toLocaleTimeString()}
                    </ThemedText>
                  )}
                </View>
                
                <ThemedText style={styles.infoText}>
                  💡 Tip: GPS works best outdoors. Move at least 0.5m to see trail updates.
                  {locationHistory.length < 2 && ' Start walking to see your path!'}
                </ThemedText>
                
                {/* Location Trail */}
                <ThemedText style={styles.chartTitle}>Movement Trail</ThemedText>
                {renderLocationTrail()}
                
                {/* Speed History */}
                {speedHistory.length > 1 && (
                  <>
                    <ThemedText style={styles.chartTitle}>Speed Over Time</ThemedText>
                    {renderLineChart(speedHistory, 'Speed (m/s)', 'rgba(153, 102, 255, 1)')}
                  </>
                )}
              </>
            ) : (
              <ThemedText style={styles.permissionText}>Loading location...</ThemedText>
            )
          ) : (
            <ThemedText style={styles.permissionText}>Location permission not granted</ThemedText>
          )}
        </View>

        {/* Microphone/Audio */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>🎤 Microphone</ThemedText>
          {audioPermission ? (
            <>
              <View style={styles.dataRow}>
                <ThemedText style={styles.label}>Status:</ThemedText>
                <ThemedText style={styles.value}>{isRecording ? '🔴 Monitoring' : '⚪️ Stopped'}</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText style={styles.label}>Audio Level:</ThemedText>
                <ThemedText style={styles.value}>{audioLevel.toFixed(1)} dB</ThemedText>
              </View>
              
              {/* Audio Waveform */}
              <ThemedText style={styles.chartTitle}>Live Waveform</ThemedText>
              {renderAudioWaveform()}
              
              {/* Audio History Chart */}
              {audioHistory.length > 1 && (
                <>
                  <ThemedText style={styles.chartTitle}>Audio Level History</ThemedText>
                  {renderLineChart(audioHistory, 'Audio Level', 'rgba(75, 192, 192, 1)')}
                </>
              )}
            </>
          ) : (
            <ThemedText style={styles.permissionText}>Microphone permission not granted</ThemedText>
          )}
        </View>

        {/* Light Sensor (via Brightness) */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>💡 Light Sensor</ThemedText>
          <View style={styles.dataRow}>
            <ThemedText style={styles.label}>Brightness:</ThemedText>
            <ThemedText style={styles.value}>{(brightness * 100).toFixed(1)}%</ThemedText>
          </View>
          
          {/* Brightness Bar */}
          <ThemedText style={styles.chartTitle}>Current Level</ThemedText>
          {renderBrightnessGradient()}
          
          {/* Brightness History */}
          {brightnessHistory.length > 1 && (
            <>
              <ThemedText style={styles.chartTitle}>Brightness History</ThemedText>
              {renderLineChart(brightnessHistory, 'Brightness %', 'rgba(255, 206, 86, 1)')}
            </>
          )}
          
          <ThemedText style={styles.infoText}>
            Note: Shows screen brightness (ambient light sensor not directly accessible)
          </ThemedText>
        </View>

        {/* Proximity Sensor */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>📡 Proximity Sensor</ThemedText>
          <ThemedText style={styles.infoText}>
            Proximity sensor is not directly accessible via Expo.
            {'\n'}Device: {deviceInfo}
          </ThemedText>
        </View>

        {/* Screen State */}
        <View style={styles.sensorCard}>
          <ThemedText type="subtitle" style={styles.sensorTitle}>📺 Screen State</ThemedText>
          <View style={styles.dataRow}>
            <ThemedText style={styles.label}>App State:</ThemedText>
            <ThemedText style={styles.value}>
              {screenState === 'active' ? '🟢 Active' : 
               screenState === 'background' ? '🟡 Background' : '🔴 Inactive'}
            </ThemedText>
          </View>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
  },
  sensorCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sensorTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  permissionText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    color: 'white',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  waveformBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  brightnessBar: {
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 12,
  },
  brightnessFill: {
    height: '100%',
    borderRadius: 15,
  },
  mapContainer: {
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  mapDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  statusText: {
    fontSize: 12,
    opacity: 0.7,
    marginVertical: 2,
  },
});
