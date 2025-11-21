import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextType {
  audioLevel: number;
  audioHistory: number[];
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  hasPermission: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const MAX_HISTORY_POINTS = 100;

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioHistory, setAudioHistory] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    requestPermission();
    
    // Auto-start recording when permission is granted
    return () => {
      // Cleanup on unmount
      if (recordingRef.current) {
        stopRecording();
      }
    };
  }, []);
  
  // Auto-start recording when permission is available
  useEffect(() => {
    if (hasPermission && !isRecording) {
      console.log('Auto-starting audio recording...');
      startRecording();
    }
  }, [hasPermission]);

  const requestPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startRecording = async () => {
    if (!hasPermission) {
      console.log('Audio permission not granted');
      return;
    }

    if (isRecording || recordingRef.current) {
      console.log('Already recording');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            const normalized = Math.max(0, Math.min(100, (status.metering + 160) / 1.6));
            setAudioLevel(normalized);
            
            // Update history in ref and state
            audioHistoryRef.current = [...audioHistoryRef.current.slice(-MAX_HISTORY_POINTS + 1), normalized];
            setAudioHistory(audioHistoryRef.current);
          }
        },
        100
      );

      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Shared audio recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) {
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
      setAudioLevel(0);
      console.log('Shared audio recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        audioLevel,
        audioHistory: audioHistoryRef.current,
        isRecording,
        startRecording,
        stopRecording,
        hasPermission,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
