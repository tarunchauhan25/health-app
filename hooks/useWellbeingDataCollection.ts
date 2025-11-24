/**
 * Hook to collect sensor data and update wellbeing scores
 * This hook integrates with the status screen's activity detection
 * and periodically updates wellbeing metrics
 */

import { useWellbeing } from '@/context/WellbeingContext';
import { getWellbeingAggregator } from '@/lib/wellbeingAggregator';
import { useEffect, useRef } from 'react';

interface ActivityStatus {
  activity: 'stationary' | 'walking' | 'running' | 'cycling' | 'sleeping' | 'unknown';
  confidence: number;
  timestamp: Date;
}

interface ConversationStatus {
  state: 'silent' | 'talking' | 'conversation';
  timestamp: Date;
  duration: number; // seconds
}

/**
 * Hook to collect activity and conversation data and update wellbeing scores
 */
export function useWellbeingDataCollection(
  currentActivity?: ActivityStatus,
  conversationState?: ConversationStatus
) {
  const { updateScores } = useWellbeing();
  const aggregator = getWellbeingAggregator();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());
  const lastActivityRef = useRef<string>('');
  const lastConversationRef = useRef<string>('');

  // Add activity data to aggregator when it changes
  useEffect(() => {
    if (currentActivity) {
      const activityKey = `${currentActivity.activity}-${currentActivity.timestamp.getTime()}`;
      // Only add if it's a new activity (not a duplicate)
      if (activityKey !== lastActivityRef.current) {
        aggregator.addActivity({
          activity: currentActivity.activity,
          confidence: currentActivity.confidence,
          timestamp: currentActivity.timestamp,
        });
        lastActivityRef.current = activityKey;
      }
    }
  }, [currentActivity, aggregator]);

  // Add conversation data to aggregator when it changes
  useEffect(() => {
    if (conversationState) {
      const conversationKey = `${conversationState.state}-${conversationState.timestamp.getTime()}`;
      // Only add if it's a new conversation state (not a duplicate)
      if (conversationKey !== lastConversationRef.current) {
        aggregator.addConversation({
          state: conversationState.state,
          timestamp: conversationState.timestamp,
          duration: conversationState.duration,
        });
        lastConversationRef.current = conversationKey;
      }
    }
  }, [conversationState, aggregator]);

  // Periodically calculate and update wellbeing scores
  useEffect(() => {
    const updateWellbeingScores = async () => {
      try {
        const metrics = aggregator.calculateTodayMetrics();
        
        // Only update if we have meaningful data
        if (
          metrics.sleepHours > 0 ||
          metrics.physicalActivityMinutes > 0 ||
          metrics.socialInteractionMinutes > 0
        ) {
          await updateScores(metrics);
          lastUpdateRef.current = new Date();
        }
      } catch (error) {
        console.error('Error updating wellbeing scores:', error);
      }
    };

    // Update every 5 minutes
    updateIntervalRef.current = setInterval(updateWellbeingScores, 5 * 60 * 1000);

    // Also update immediately on mount
    updateWellbeingScores();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [aggregator, updateScores]);

  return {
    aggregator,
    lastUpdate: lastUpdateRef.current,
  };
}

