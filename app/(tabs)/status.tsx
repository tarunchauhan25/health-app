import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAudio } from '@/context/AudioContext';
import { useWellbeingDataCollection } from '@/hooks/useWellbeingDataCollection';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

// Activity Types
type ActivityType = 'stationary' | 'walking' | 'running' | 'cycling' | 'sleeping' | 'unknown';
type ConversationState = 'silent' | 'talking' | 'conversation';
type LocationState = 'indoor' | 'outdoor' | 'moving' | 'stationary';

interface ActivityStatus {
  activity: ActivityType;
  confidence: number;
  timestamp: Date;
}

const screenWidth = Dimensions.get('window').width;

export default function StatusScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Router for navigation
  const router = useRouter();

  // Get shared audio recording from context
  const { audioLevel: sharedAudioLevel, audioHistory: sharedAudioHistory, hasPermission: audioPermission } = useAudio();

  // Sensor permissions
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  // Current sensor readings
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [speed, setSpeed] = useState<number>(0);
  const [rawSpeed, setRawSpeed] = useState<number>(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(999);

  // Activity recognition state
  const [currentActivity, setCurrentActivity] = useState<ActivityType>('unknown');
  const [activityConfidence, setActivityConfidence] = useState<number>(0);
  const [conversationState, setConversationState] = useState<ConversationState>('silent');
  const [locationState, setLocationState] = useState<LocationState>('stationary');
  
  // Historical data - using refs
  const accelHistoryRef = useRef<number[]>([]);
  const speedHistoryRef = useRef<number[]>([]);
  const audioHistoryRef = useRef<number[]>([]);
  const activityHistoryRef = useRef<ActivityStatus[]>([]);
  
  // Display state
  const [accelHistory, setAccelHistory] = useState<number[]>([]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [audioHistory, setAudioHistory] = useState<number[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityStatus[]>([]);

  // Monitoring state
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const accelSubscription = useRef<any>(null);

  // Sleep detection
  const [possibleSleeping, setPossibleSleeping] = useState<boolean>(false);
  const inactiveTimeRef = useRef<number>(0);
  const [inactiveTime, setInactiveTime] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Track conversation duration for wellbeing
  const conversationDurationRef = useRef<number>(0);
  const lastConversationStateRef = useRef<ConversationState>('silent');
  const lastConversationChangeRef = useRef<Date>(new Date());
  
  // Use wellbeing data collection hook
  useWellbeingDataCollection(
    currentActivity ? {
      activity: currentActivity,
      confidence: activityConfidence,
      timestamp: new Date(),
    } : undefined,
    conversationState !== lastConversationStateRef.current ? {
      state: conversationState,
      timestamp: new Date(),
      duration: conversationDurationRef.current,
    } : undefined
  );
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 10,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Permissions and monitoring setup
  useEffect(() => {
    requestPermissions();
  }, []);

  // Start/stop monitoring based on screen focus
  useFocusEffect(
    useCallback(() => {
      if (locationPermission && audioPermission) {
        startMonitoring();
      }
      
      return () => {
        stopMonitoring();
      };
    }, [locationPermission, audioPermission])
  );

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      classifyActivity();
      detectConversation();
      detectLocation();
      detectSleep();
      setLastUpdate(new Date());
      setAccelHistory([...accelHistoryRef.current]);
      setSpeedHistory([...speedHistoryRef.current]);
      setAudioHistory([...audioHistoryRef.current]);
      setActivityHistory([...activityHistoryRef.current]);
      
      // Track conversation duration for wellbeing
      if (conversationState === 'talking' || conversationState === 'conversation') {
        if (lastConversationStateRef.current !== conversationState) {
          lastConversationChangeRef.current = new Date();
          lastConversationStateRef.current = conversationState;
        }
        conversationDurationRef.current = 
          (new Date().getTime() - lastConversationChangeRef.current.getTime()) / 1000;
      } else {
        if (lastConversationStateRef.current !== 'silent') {
          lastConversationStateRef.current = 'silent';
          conversationDurationRef.current = 0;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, conversationState]);

  const requestPermissions = async () => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus === 'granted');
  };

  const startMonitoring = async () => {
    console.log('Starting monitoring...');
    setIsMonitoring(true);

    Accelerometer.setUpdateInterval(100);
    accelSubscription.current = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      accelHistoryRef.current = [...accelHistoryRef.current.slice(-100), magnitude];
    });

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 500,
          distanceInterval: 0,
        },
        (loc) => {
          setLocation(loc);
          const currentSpeed = loc.coords.speed || 0;
          const accuracy = loc.coords.accuracy || 999;
          setRawSpeed(currentSpeed);
          setGpsAccuracy(accuracy);
          let filteredSpeed = currentSpeed;
          if (accuracy > 20 || currentSpeed < 0.2) filteredSpeed = 0;
          speedHistoryRef.current = [...speedHistoryRef.current.slice(-10), filteredSpeed];
          const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
          setSpeed(avgSpeed);
        }
      );
      locationSubscription.current = subscription;
    } catch (error) {
      console.log('Location error:', error);
    }

    // Audio monitoring is handled by shared AudioContext
    // Just set monitoring flag
    setIsMonitoring(true);
    console.log('Status: Monitoring started (using shared audio context)');
  };

  const stopMonitoring = async () => {
    setIsMonitoring(false);
    if (accelSubscription.current) accelSubscription.current.remove();
    if (locationSubscription.current) locationSubscription.current.remove();
    // Audio recording is managed by shared AudioContext, not stopped here
    console.log('Status: Monitoring stopped');
  };

  // Classification functions (keeping existing logic)
  const classifyActivity = () => {
    const recentAccel = accelHistoryRef.current.slice(-30);
    if (recentAccel.length < 10) return;
    const recentSpeed = speedHistoryRef.current.slice(-10);
    const accelMean = recentAccel.reduce((a, b) => a + b, 0) / recentAccel.length;
    const accelVariance = recentAccel.reduce((sum, val) => sum + Math.pow(val - accelMean, 2), 0) / recentAccel.length;
    const accelStd = Math.sqrt(accelVariance);
    const speedMean = recentSpeed.length > 0 ? recentSpeed.reduce((a, b) => a + b, 0) / recentSpeed.length : 0;
    const deviationFromGravity = Math.abs(accelMean - 1.0);
    let activity: ActivityType = 'unknown';
    let confidence = 0;
    if (accelStd < 0.05 && speedMean < 0.3 && deviationFromGravity < 0.1) {
      activity = 'stationary';
      confidence = Math.min(95, 80 + (1 - accelStd * 10) * 15);
      inactiveTimeRef.current += 1;
    } else if ((accelStd >= 0.05 && accelStd < 0.4 && speedMean >= 0.3 && speedMean < 2.5) ||
             (deviationFromGravity >= 0.1 && speedMean >= 0.3 && speedMean < 2.5)) {
      activity = 'walking';
      confidence = Math.min(92, 65 + accelStd * 60);
      inactiveTimeRef.current = 0;
    } else if ((accelStd >= 0.4 && speedMean >= 2.0) || (speedMean >= 2.5 && speedMean < 7)) {
      activity = 'running';
      confidence = Math.min(95, 75 + Math.min(accelStd, 1) * 20);
      inactiveTimeRef.current = 0;
    } else if (speedMean >= 3.5 && speedMean < 12 && accelStd < 0.4) {
      activity = 'cycling';
      confidence = Math.min(88, 65 + (speedMean / 12) * 23);
      inactiveTimeRef.current = 0;
    } else if (accelStd >= 0.05 && accelStd < 0.5 && speedMean < 0.3 && gpsAccuracy > 20) {
      activity = 'walking';
      confidence = Math.min(75, 50 + accelStd * 50);
      inactiveTimeRef.current = 0;
    } else if (accelStd < 0.03 && speedMean < 0.2 && inactiveTimeRef.current > 30) {
      // Reduced from 120 to 30 seconds (more realistic)
      activity = 'sleeping';
      confidence = Math.min(90, 60 + Math.min(inactiveTimeRef.current / 120, 1) * 30);
    } else if (speedMean < 0.3) {
      activity = 'stationary';
      confidence = 55;
      inactiveTimeRef.current += 1;
    } else {
      activity = 'unknown';
      confidence = 35;
      inactiveTimeRef.current = 0;
    }
    setCurrentActivity(activity);
    setActivityConfidence(confidence);
    setInactiveTime(inactiveTimeRef.current);
    if (activityHistoryRef.current.length === 0 || 
        activityHistoryRef.current[activityHistoryRef.current.length - 1].activity !== activity) {
      activityHistoryRef.current = [...activityHistoryRef.current.slice(-20), { activity, confidence, timestamp: new Date() }];
    }
  };

  const detectConversation = () => {
    // Use shared audio history from context
    const recentAudio = sharedAudioHistory.slice(-50);
    if (recentAudio.length < 20) return;
    const audioMean = recentAudio.reduce((a, b) => a + b, 0) / recentAudio.length;
    const threshold = audioMean + 8;
    const peaks = recentAudio.filter(level => level > threshold).length;
    const peakRate = peaks / recentAudio.length;
    const audioVariance = recentAudio.reduce((sum, val) => sum + Math.pow(val - audioMean, 2), 0) / recentAudio.length;
    const audioStd = Math.sqrt(audioVariance);
    let newState: ConversationState = 'silent';
    if (audioMean < 12) newState = 'silent';
    else if (audioMean >= 12 && audioMean < 30) newState = peakRate < 0.25 ? 'silent' : 'talking';
    else if (audioMean >= 30 && audioMean < 45) newState = 'talking';
    else if (audioMean >= 45 || (peakRate >= 0.35 && audioStd > 12)) newState = 'conversation';
    else newState = 'talking';
    if (newState !== conversationState) setConversationState(newState);
  };

  const detectLocation = () => {
    const recentSpeed = speedHistoryRef.current.slice(-10);
    if (recentSpeed.length < 3) return;
    const avgSpeed = recentSpeed.reduce((a, b) => a + b, 0) / recentSpeed.length;
    const maxSpeed = Math.max(...recentSpeed);
    let newState: LocationState = 'stationary';
    if (avgSpeed >= 0.5 || maxSpeed >= 0.8) newState = 'moving';
    else if (avgSpeed < 0.5 && gpsAccuracy <= 30) newState = 'outdoor';
    else if (avgSpeed < 0.5 && gpsAccuracy > 30) newState = 'indoor';
    else newState = 'stationary';
    if (newState !== locationState) setLocationState(newState);
  };

  const detectSleep = () => {
    const currentHour = new Date().getHours();
    // Broader night time window: 9 PM to 8 AM
    const isNightTime = currentHour >= 21 || currentHour <= 8;
    // Reduced to 30 seconds instead of 120
    const isInactive = inactiveTimeRef.current > 30;
    const isQuiet = sharedAudioLevel < 15;
    const recentAccel = accelHistoryRef.current.slice(-20);
    const isStill = recentAccel.length > 0 && recentAccel.every(mag => Math.abs(mag - 1) < 0.1);
    const shouldSleep = isNightTime && isInactive && isQuiet && isStill;
    if (shouldSleep !== possibleSleeping) setPossibleSleeping(shouldSleep);
  };

  // UI Helper functions
  const getActivityIcon = (activity: ActivityType): string => {
    switch (activity) {
      case 'stationary': return 'STILL';
      case 'walking': return 'WALK';
      case 'running': return 'RUN';
      case 'cycling': return 'CYCLE';
      case 'sleeping': return 'SLEEP';
      default: return '?';
    }
  };

  const getActivityGradient = (activity: ActivityType): [string, string, string] => {
    switch (activity) {
      case 'stationary': return ['#6B7280', '#9CA3AF', '#D1D5DB'];
      case 'walking': return ['#10B981', '#34D399', '#6EE7B7'];
      case 'running': return ['#EF4444', '#F87171', '#FCA5A5'];
      case 'cycling': return ['#3B82F6', '#60A5FA', '#93C5FD'];
      case 'sleeping': return ['#8B5CF6', '#A78BFA', '#C4B5FD'];
      default: return ['#9CA3AF', '#D1D5DB', '#E5E7EB'];
    }
  };

  const getConversationGradient = (state: ConversationState): [string, string, string] => {
    switch (state) {
      case 'silent': return ['#64748B', '#94A3B8', '#CBD5E1'];
      case 'talking': return ['#F59E0B', '#FBBF24', '#FCD34D'];
      case 'conversation': return ['#EC4899', '#F472B6', '#F9A8D4'];
    }
  };

  const getLocationGradient = (state: LocationState): [string, string, string] => {
    switch (state) {
      case 'indoor': return ['#8B5CF6', '#A78BFA', '#C4B5FD'];
      case 'outdoor': return ['#10B981', '#34D399', '#6EE7B7'];
      case 'moving': return ['#3B82F6', '#60A5FA', '#93C5FD'];
      case 'stationary': return ['#6B7280', '#9CA3AF', '#D1D5DB'];
    }
  };

  if (!locationPermission || !audioPermission) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#E2E8F0']}
          style={styles.background}
        >
          <View style={styles.permissionContainer}>
            <ThemedText type="title" style={styles.title}>Status Monitor</ThemedText>
            <ThemedText style={styles.permissionText}>
              This feature requires location and microphone permissions.
            </ThemedText>
            {!locationPermission && <ThemedText style={styles.permissionText}>❌ Location</ThemedText>}
            {!audioPermission && <ThemedText style={styles.permissionText}>❌ Microphone</ThemedText>}
          </View>
        </LinearGradient>
      </ThemedView>
    );
  }

  return (
    
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B', '#334155'] : ['#F8FAFC', '#E2E8F0', '#CBD5E1']}
          style={styles.background}
        >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View>
              <ThemedText style={styles.title}>Status Monitor</ThemedText>
              <ThemedText style={styles.subtitle}>Real-time activity detection</ThemedText>
            </View>
            <View style={styles.liveContainer}>
              <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.liveBlur}>
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
                  style={styles.liveGradient}
                >
                  <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                  <ThemedText style={styles.liveText}>LIVE</ThemedText>
                </LinearGradient>
              </BlurView>
            </View>
          </Animated.View>

          {/* Main Activity - Liquid Glass Card */}
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.liquidCard}>
              <LinearGradient
                colors={getActivityGradient(currentActivity)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liquidGradient}
              >
                <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                  <View style={styles.liquidContent}>
                    <View style={styles.activityHeader}>
                      <View style={styles.activityIconBadge}>
                        <LinearGradient
                          colors={getActivityGradient(currentActivity)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.activityIconGradient}
                        >
                          <ThemedText style={styles.activityIconText}>{getActivityIcon(currentActivity)}</ThemedText>
                        </LinearGradient>
                      </View>
                      <View style={styles.activityInfo}>
                        <ThemedText style={styles.activityLabel}>CURRENT ACTIVITY</ThemedText>
                        <ThemedText style={styles.activityValue} numberOfLines={1} ellipsizeMode="tail">
                          {currentActivity.charAt(0).toUpperCase() + currentActivity.slice(1)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.confidenceContainer}>
                      <View style={styles.confidenceRow}>
                        <ThemedText style={styles.confidenceText}>Confidence</ThemedText>
                        <ThemedText style={styles.confidencePercent}>{activityConfidence.toFixed(0)}%</ThemedText>
                      </View>
                      <View style={styles.progressBarBg}>
                        <LinearGradient
                          colors={getActivityGradient(currentActivity)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressBarFill, { width: `${activityConfidence}%` }]}
                        />
                      </View>
                    </View>
                  </View>
                </BlurView>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Sleep Alert */}
          {possibleSleeping && (
            <Animated.View style={[{ opacity: fadeAnim }]}>
              <View style={styles.liquidCard}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liquidGradient}
                >
                  <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                    <View style={styles.sleepContent}>
                      <ThemedText style={styles.sleepTitle}>Sleep Detected</ThemedText>
                      <ThemedText style={styles.sleepSubtitle}>
                        Inactive for {Math.floor(inactiveTime / 60)}m {inactiveTime % 60}s
                      </ThemedText>
                    </View>
                  </BlurView>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          {/* Status Grid */}
          <View style={styles.gridRow}>
            {/* Conversation */}
            <Animated.View style={[styles.gridItem, { opacity: fadeAnim }]}>
              <View style={styles.liquidCard}>
                <LinearGradient
                  colors={getConversationGradient(conversationState)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liquidGradient}
                >
                  <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconBadge}>
                        <LinearGradient
                          colors={getConversationGradient(conversationState)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gridIconGradient}
                        >
                          <ThemedText style={styles.gridIconText}>
                            {conversationState === 'silent' ? 'MUTE' : conversationState === 'talking' ? 'TALK' : 'CONV'}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                      <ThemedText style={styles.gridLabel}>CONVERSATION</ThemedText>
                      <ThemedText style={styles.gridValue} numberOfLines={1} ellipsizeMode="tail">
                        {conversationState === 'silent' ? 'Silent' : conversationState === 'talking' ? 'Talking' : 'Active'}
                      </ThemedText>
                      <ThemedText style={styles.gridMetric}>{sharedAudioLevel.toFixed(0)} dB</ThemedText>
                    </View>
                  </BlurView>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Location */}
            <Animated.View style={[styles.gridItem, { opacity: fadeAnim }]}>
              <View style={styles.liquidCard}>
                <LinearGradient
                  colors={getLocationGradient(locationState)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liquidGradient}
                >
                  <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconBadge}>
                        <LinearGradient
                          colors={getLocationGradient(locationState)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gridIconGradient}
                        >
                          <ThemedText style={styles.gridIconText}>
                            {locationState === 'indoor' ? 'IN' : locationState === 'outdoor' ? 'OUT' : 
                             locationState === 'moving' ? 'MOVE' : 'STILL'}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                      <ThemedText style={styles.gridLabel}>LOCATION</ThemedText>
                      <ThemedText style={styles.gridValue} numberOfLines={1} ellipsizeMode="tail">
                        {locationState.charAt(0).toUpperCase() + locationState.slice(1)}
                      </ThemedText>
                      <ThemedText style={styles.gridMetric}>{(speed * 3.6).toFixed(1)} km/h</ThemedText>
                    </View>
                  </BlurView>
                </LinearGradient>
              </View>
            </Animated.View>
          </View>

          {/* Sleep Status Grid Row */}
          <View style={styles.gridRow}>
            {/* Sleep Status */}
            <Animated.View style={[styles.gridItem, { opacity: fadeAnim }]}>
              <View style={styles.liquidCard}>
                <LinearGradient
                  colors={possibleSleeping ? ['#8B5CF6', '#A78BFA', '#C4B5FD'] : ['#6B7280', '#9CA3AF', '#D1D5DB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liquidGradient}
                >
                  <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconBadge}>
                        <LinearGradient
                          colors={possibleSleeping ? ['#8B5CF6', '#A78BFA', '#C4B5FD'] : ['#6B7280', '#9CA3AF', '#D1D5DB']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gridIconGradient}
                        >
                          <ThemedText style={styles.gridIconText}>
                            {possibleSleeping ? 'SLEEP' : 'AWAKE'}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                      <ThemedText style={styles.gridLabel}>SLEEP STATUS</ThemedText>
                      <ThemedText style={styles.gridValue} numberOfLines={1} ellipsizeMode="tail">
                        {possibleSleeping ? 'Sleeping' : 'Awake'}
                      </ThemedText>
                      <ThemedText style={styles.gridMetric}>
                        {inactiveTime > 0 ? `${Math.floor(inactiveTime / 60)}m ${inactiveTime % 60}s` : 'Active'}
                      </ThemedText>
                    </View>
                  </BlurView>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Inactivity Timer */}
            <Animated.View style={[styles.gridItem, { opacity: fadeAnim }]}>
              <View style={styles.liquidCard}>
                <LinearGradient
                  colors={inactiveTime > 60 ? ['#F59E0B', '#FBBF24', '#FCD34D'] : ['#10B981', '#34D399', '#6EE7B7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liquidGradient}
                >
                  <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconBadge}>
                        <LinearGradient
                          colors={inactiveTime > 60 ? ['#F59E0B', '#FBBF24', '#FCD34D'] : ['#10B981', '#34D399', '#6EE7B7']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gridIconGradient}
                        >
                          <ThemedText style={styles.gridIconText}>
                            {inactiveTime > 60 ? 'IDLE' : 'MOVE'}
                          </ThemedText>
                        </LinearGradient>
                      </View>
                      <ThemedText style={styles.gridLabel}>ACTIVITY</ThemedText>
                      <ThemedText style={styles.gridValue} numberOfLines={1} ellipsizeMode="tail">
                        {inactiveTime > 60 ? 'Inactive' : 'Active'}
                      </ThemedText>
                      <ThemedText style={styles.gridMetric}>
                        {inactiveTime > 0 ? `${Math.floor(inactiveTime / 60)}:${(inactiveTime % 60).toString().padStart(2, '0')}` : '0:00'}
                      </ThemedText>
                    </View>
                  </BlurView>
                </LinearGradient>
              </View>
            </Animated.View>
          </View>

          {/* Metrics */}
          <Animated.View style={[{ opacity: fadeAnim }]}>
            <View style={styles.liquidCard}>
              <LinearGradient
                colors={isDark ? ['#334155', '#475569', '#64748B'] : ['#FFFFFF', '#F1F5F9', '#E2E8F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liquidGradient}
              >
                <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                  <View style={styles.liquidContent}>
                    <ThemedText style={styles.sectionTitle}>Live Metrics</ThemedText>
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricBox}>
                        <ThemedText style={styles.metricValue}>
                          {accelHistory.length > 0 ? accelHistory[accelHistory.length - 1].toFixed(2) : '0.00'}
                        </ThemedText>
                        <ThemedText style={styles.metricLabel}>Acceleration</ThemedText>
                        <ThemedText style={styles.metricUnit}>m/s²</ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={styles.metricValue}>{(rawSpeed * 3.6).toFixed(1)}</ThemedText>
                        <ThemedText style={styles.metricLabel}>GPS Speed</ThemedText>
                        <ThemedText style={styles.metricUnit}>km/h</ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={styles.metricValue}>{gpsAccuracy.toFixed(0)}</ThemedText>
                        <ThemedText style={styles.metricLabel}>GPS Accuracy</ThemedText>
                        <ThemedText style={styles.metricUnit}>meters</ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={styles.metricValue}>
                          {audioHistory.length > 0 ? audioHistory.slice(-30).filter(l => l > 25).length : 0}
                        </ThemedText>
                        <ThemedText style={styles.metricLabel}>Audio Peaks</ThemedText>
                        <ThemedText style={styles.metricUnit}>last 3s</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.updateText}>Updated {lastUpdate.toLocaleTimeString()}</ThemedText>
                  </View>
                </BlurView>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Activity History */}
          <Animated.View style={[{ opacity: fadeAnim }]}>
            <View style={styles.liquidCard}>
              <LinearGradient
                colors={isDark ? ['#334155', '#475569', '#64748B'] : ['#FFFFFF', '#F1F5F9', '#E2E8F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liquidGradient}
              >
                <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.liquidBlur}>
                  <View style={styles.liquidContent}>
                    <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
                    {activityHistory.length > 0 ? (
                      <View style={styles.historyList}>
                        {activityHistory.slice().reverse().slice(0, 5).map((status, index) => (
                          <View key={index} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                              <View style={styles.historyIconBadge}>
                                <LinearGradient
                                  colors={getActivityGradient(status.activity).slice(0, 2) as [string, string]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={styles.historyIconGradient}
                                >
                                  <ThemedText style={styles.historyIconText}>{getActivityIcon(status.activity)}</ThemedText>
                                </LinearGradient>
                              </View>
                              <View style={styles.historyTextContainer}>
                                <ThemedText style={styles.historyActivity} numberOfLines={1}>
                                  {status.activity.charAt(0).toUpperCase() + status.activity.slice(1)}
                                </ThemedText>
                                <ThemedText style={styles.historyTime}>
                                  {status.timestamp.toLocaleTimeString()}
                                </ThemedText>
                              </View>
                            </View>
                            <LinearGradient
                              colors={getActivityGradient(status.activity).slice(0, 2) as [string, string]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.historyBadge}
                            >
                              <ThemedText style={styles.historyBadgeText}>{status.confidence.toFixed(0)}%</ThemedText>
                            </LinearGradient>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ThemedText style={styles.emptyText}>Move around to see activity history</ThemedText>
                    )}
                  </View>
                </BlurView>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.navButtonText}>Go to home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)/phq9')}
            >
              <Text style={styles.navButtonText}>See your PHQ-9 score</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)/sensors')}
            >
              <Text style={styles.navButtonText}>See live sensor data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)/history')}
            >
              <Text style={styles.navButtonText}>View your history</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.navButtonText}>Explore more info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.navButtonText}>Go to profile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </ThemedView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  liveContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  liveBlur: {
    borderRadius: 20,
  },
  liveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  liquidCard: {
    borderRadius: 28,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  liquidGradient: {
    borderRadius: 28,
  },
  liquidBlur: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  liquidContent: {
    padding: 24,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  activityIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 20,
  },
  activityIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  activityValue: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  confidenceContainer: {
    marginTop: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  confidencePercent: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sleepContent: {
    padding: 24,
    alignItems: 'center',
  },
  sleepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sleepSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  gridCardContent: {
    padding: 20,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  gridIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  gridMetric: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBox: {
    width: '47%',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  metricValue: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 11,
    opacity: 0.5,
  },
  updateText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 18,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  historyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    flexShrink: 0,
  },
  historyIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyTextContainer: {
    flex: 1,
  },
  historyActivity: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 13,
    opacity: 0.6,
  },
  historyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    flexShrink: 0,
  },
  historyBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 8,
  },
  navigationContainer: {
    marginTop: 30,
    marginBottom: 20,
    gap: 12,
  },
  navButton: {
    backgroundColor: '#424242',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
