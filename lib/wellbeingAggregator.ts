/**
 * Wellbeing Data Aggregator
 * 
 * Aggregates sensor data and activity detection to calculate daily wellbeing metrics
 * This service processes real-time sensor data and converts it into metrics
 * that can be used for wellbeing scoring.
 */

import {
  ActivityData,
  ConversationData,
  WellbeingMetrics,
  calculateSleepHoursFromActivities,
  calculatePhysicalActivityMinutesFromActivities,
  calculateSocialInteractionMinutesFromConversations,
} from './wellbeingScoring';

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
 * Aggregate service that processes sensor data into wellbeing metrics
 */
export class WellbeingAggregator {
  private activityHistory: ActivityStatus[] = [];
  private conversationHistory: ConversationStatus[] = [];
  private readonly MAX_HISTORY_DAYS = 7; // Keep 7 days of history

  /**
   * Add activity data point
   */
  addActivity(activity: ActivityStatus) {
    this.activityHistory.push(activity);
    
    // Clean up old data (keep only last 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.MAX_HISTORY_DAYS);
    this.activityHistory = this.activityHistory.filter(
      (a) => a.timestamp >= cutoff
    );
  }

  /**
   * Add conversation data point
   */
  addConversation(conversation: ConversationStatus) {
    this.conversationHistory.push(conversation);
    
    // Clean up old data
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.MAX_HISTORY_DAYS);
    this.conversationHistory = this.conversationHistory.filter(
      (c) => c.timestamp >= cutoff
    );
  }

  /**
   * Calculate current day's wellbeing metrics
   */
  calculateTodayMetrics(): WellbeingMetrics {
    const today = new Date();
    
    // Convert activity history to ActivityData format
    const activityData: ActivityData[] = this.activityHistory.map((a) => ({
      timestamp: a.timestamp,
      activity: a.activity,
      confidence: a.confidence,
    }));
    
    // Convert conversation history to ConversationData format
    const conversationData: ConversationData[] = this.conversationHistory.map((c) => ({
      timestamp: c.timestamp,
      state: c.state,
      duration: c.duration,
    }));
    
    // Calculate metrics
    const sleepHours = calculateSleepHoursFromActivities(activityData, today);
    const physicalActivityMinutes = calculatePhysicalActivityMinutesFromActivities(
      activityData,
      today
    );
    const socialInteractionMinutes = calculateSocialInteractionMinutesFromConversations(
      conversationData,
      today
    );
    
    return {
      sleepHours,
      physicalActivityMinutes,
      socialInteractionMinutes,
    };
  }

  /**
   * Calculate metrics for a specific date
   */
  calculateMetricsForDate(date: Date): WellbeingMetrics {
    const activityData: ActivityData[] = this.activityHistory
      .filter((a) => {
        const activityDate = new Date(a.timestamp);
        return (
          activityDate.getFullYear() === date.getFullYear() &&
          activityDate.getMonth() === date.getMonth() &&
          activityDate.getDate() === date.getDate()
        );
      })
      .map((a) => ({
        timestamp: a.timestamp,
        activity: a.activity,
        confidence: a.confidence,
      }));
    
    const conversationData: ConversationData[] = this.conversationHistory
      .filter((c) => {
        const convDate = new Date(c.timestamp);
        return (
          convDate.getFullYear() === date.getFullYear() &&
          convDate.getMonth() === date.getMonth() &&
          convDate.getDate() === date.getDate()
        );
      })
      .map((c) => ({
        timestamp: c.timestamp,
        state: c.state,
        duration: c.duration,
      }));
    
    const sleepHours = calculateSleepHoursFromActivities(activityData, date);
    const physicalActivityMinutes = calculatePhysicalActivityMinutesFromActivities(
      activityData,
      date
    );
    const socialInteractionMinutes = calculateSocialInteractionMinutesFromConversations(
      conversationData,
      date
    );
    
    return {
      sleepHours,
      physicalActivityMinutes,
      socialInteractionMinutes,
    };
  }

  /**
   * Get activity history
   */
  getActivityHistory(): ActivityStatus[] {
    return [...this.activityHistory];
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationStatus[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.activityHistory = [];
    this.conversationHistory = [];
  }
}

// Singleton instance
let aggregatorInstance: WellbeingAggregator | null = null;

export function getWellbeingAggregator(): WellbeingAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new WellbeingAggregator();
  }
  return aggregatorInstance;
}

