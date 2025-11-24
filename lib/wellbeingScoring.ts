/**
 * BeWell Wellbeing Scoring System
 * 
 * Implements the scoring methodology from the BeWell paper:
 * - Three dimensions: Sleep, Physical Activity, Social Interactions
 * - Scores range from 0-100
 * - Uses exponentially weighted averages of daily scores
 * - Score of 100 = matching accepted guidelines
 * - Score of 0 = not attaining minimum recommended patterns
 */

export interface DailyWellbeingScores {
  date: string; // YYYY-MM-DD format
  sleep: number; // 0-100
  physicalActivity: number; // 0-100
  socialInteraction: number; // 0-100
}

export interface WellbeingMetrics {
  sleepHours: number; // Total sleep hours for the day
  physicalActivityMinutes: number; // Minutes of moderate/vigorous activity
  socialInteractionMinutes: number; // Minutes of conversation/social activity
}

export interface WellbeingScore {
  sleep: number; // 0-100
  physicalActivity: number; // 0-100
  socialInteraction: number; // 0-100
  overall: number; // Average of three dimensions
  lastUpdated: Date;
}

/**
 * Calculate daily sleep score based on sleep duration
 * Guidelines: 8+ hours = 100, 7 hours = 80, 6 hours = 60, <5 hours = 0
 */
export function calculateSleepScore(sleepHours: number): number {
  if (sleepHours >= 8) {
    return 100;
  } else if (sleepHours >= 7.5) {
    // Linear interpolation between 7.5 and 8 hours
    return 90 + ((sleepHours - 7.5) / 0.5) * 10;
  } else if (sleepHours >= 7) {
    // Linear interpolation between 7 and 7.5 hours
    return 80 + ((sleepHours - 7) / 0.5) * 10;
  } else if (sleepHours >= 6) {
    // Linear interpolation between 6 and 7 hours
    return 60 + ((sleepHours - 6) / 1) * 20;
  } else if (sleepHours >= 5) {
    // Linear interpolation between 5 and 6 hours
    return 30 + ((sleepHours - 5) / 1) * 30;
  } else if (sleepHours >= 4) {
    // Linear interpolation between 4 and 5 hours
    return 10 + ((sleepHours - 4) / 1) * 20;
  } else {
    // Less than 4 hours
    return Math.max(0, (sleepHours / 4) * 10);
  }
}

/**
 * Calculate daily physical activity score
 * Guidelines: 150+ minutes of moderate activity per week = 100
 * This translates to ~21.4 minutes per day average
 * We'll use daily targets: 30+ minutes = 100, 20 minutes = 80, 10 minutes = 50, <5 minutes = 0
 */
export function calculatePhysicalActivityScore(activityMinutes: number): number {
  // Target: 30 minutes of moderate/vigorous activity per day
  if (activityMinutes >= 30) {
    return 100;
  } else if (activityMinutes >= 20) {
    // Linear interpolation between 20 and 30 minutes
    return 80 + ((activityMinutes - 20) / 10) * 20;
  } else if (activityMinutes >= 15) {
    // Linear interpolation between 15 and 20 minutes
    return 65 + ((activityMinutes - 15) / 5) * 15;
  } else if (activityMinutes >= 10) {
    // Linear interpolation between 10 and 15 minutes
    return 50 + ((activityMinutes - 10) / 5) * 15;
  } else if (activityMinutes >= 5) {
    // Linear interpolation between 5 and 10 minutes
    return 25 + ((activityMinutes - 5) / 5) * 25;
  } else {
    // Less than 5 minutes
    return Math.max(0, (activityMinutes / 5) * 25);
  }
}

/**
 * Calculate daily social interaction score
 * Guidelines: Regular social interaction is important for mental health
 * We'll use conversation time: 60+ minutes = 100, 30 minutes = 70, 15 minutes = 40, <5 minutes = 0
 */
export function calculateSocialInteractionScore(interactionMinutes: number): number {
  // Target: 60 minutes of meaningful social interaction per day
  if (interactionMinutes >= 60) {
    return 100;
  } else if (interactionMinutes >= 45) {
    // Linear interpolation between 45 and 60 minutes
    return 85 + ((interactionMinutes - 45) / 15) * 15;
  } else if (interactionMinutes >= 30) {
    // Linear interpolation between 30 and 45 minutes
    return 70 + ((interactionMinutes - 30) / 15) * 15;
  } else if (interactionMinutes >= 20) {
    // Linear interpolation between 20 and 30 minutes
    return 55 + ((interactionMinutes - 20) / 10) * 15;
  } else if (interactionMinutes >= 10) {
    // Linear interpolation between 10 and 20 minutes
    return 40 + ((interactionMinutes - 10) / 10) * 15;
  } else if (interactionMinutes >= 5) {
    // Linear interpolation between 5 and 10 minutes
    return 20 + ((interactionMinutes - 5) / 5) * 20;
  } else {
    // Less than 5 minutes
    return Math.max(0, (interactionMinutes / 5) * 20);
  }
}

/**
 * Calculate daily wellbeing scores from metrics
 */
export function calculateDailyScores(metrics: WellbeingMetrics): DailyWellbeingScores {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    date: today,
    sleep: calculateSleepScore(metrics.sleepHours),
    physicalActivity: calculatePhysicalActivityScore(metrics.physicalActivityMinutes),
    socialInteraction: calculateSocialInteractionScore(metrics.socialInteractionMinutes),
  };
}

/**
 * Calculate exponentially weighted average of wellbeing scores
 * Uses alpha (decay factor) to weight recent scores more heavily
 * Default alpha = 0.3 (30% weight for new score, 70% for historical average)
 */
export function calculateExponentiallyWeightedScore(
  historicalScore: number,
  newDailyScore: number,
  alpha: number = 0.3
): number {
  // Exponentially weighted moving average: EMA = alpha * new + (1 - alpha) * old
  return alpha * newDailyScore + (1 - alpha) * historicalScore;
}

/**
 * Calculate overall wellbeing score from individual dimension scores
 */
export function calculateOverallScore(scores: {
  sleep: number;
  physicalActivity: number;
  socialInteraction: number;
}): number {
  return (scores.sleep + scores.physicalActivity + scores.socialInteraction) / 3;
}

/**
 * Aggregate activity data to calculate daily metrics
 * This function processes sensor data to extract wellbeing metrics
 */
export interface ActivityData {
  timestamp: Date;
  activity: 'stationary' | 'walking' | 'running' | 'cycling' | 'sleeping' | 'unknown';
  confidence: number;
}

export interface ConversationData {
  timestamp: Date;
  state: 'silent' | 'talking' | 'conversation';
  duration: number; // seconds
}

/**
 * Calculate sleep hours from activity data
 * Assumes sleeping activity during night hours (9 PM - 8 AM)
 */
export function calculateSleepHoursFromActivities(
  activities: ActivityData[],
  date: Date = new Date()
): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  // Filter activities for the given day
  const dayActivities = activities.filter(
    (a) => a.timestamp >= dayStart && a.timestamp <= dayEnd
  );
  
  // Count sleep periods
  // Sleep is detected during night hours (9 PM - 8 AM)
  let sleepSeconds = 0;
  const sleepThreshold = 0.7; // 70% confidence threshold
  
  for (let i = 0; i < dayActivities.length - 1; i++) {
    const current = dayActivities[i];
    const next = dayActivities[i + 1];
    
    if (current.activity === 'sleeping' && current.confidence >= sleepThreshold * 100) {
      const hour = current.timestamp.getHours();
      // Night time: 9 PM (21) to 8 AM (8)
      const isNightTime = hour >= 21 || hour <= 8;
      
      if (isNightTime) {
        const duration = (next.timestamp.getTime() - current.timestamp.getTime()) / 1000;
        sleepSeconds += duration;
      }
    }
  }
  
  return sleepSeconds / 3600; // Convert to hours
}

/**
 * Calculate physical activity minutes from activity data
 * Counts walking, running, and cycling as physical activity
 */
export function calculatePhysicalActivityMinutesFromActivities(
  activities: ActivityData[],
  date: Date = new Date()
): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  // Filter activities for the given day
  const dayActivities = activities.filter(
    (a) => a.timestamp >= dayStart && a.timestamp <= dayEnd
  );
  
  let activitySeconds = 0;
  const activityTypes: Array<'walking' | 'running' | 'cycling'> = ['walking', 'running', 'cycling'];
  const confidenceThreshold = 0.6; // 60% confidence threshold
  
  for (let i = 0; i < dayActivities.length - 1; i++) {
    const current = dayActivities[i];
    const next = dayActivities[i + 1];
    
    if (
      activityTypes.includes(current.activity as any) &&
      current.confidence >= confidenceThreshold * 100
    ) {
      const duration = (next.timestamp.getTime() - current.timestamp.getTime()) / 1000;
      
      // Weight different activities differently
      // Running and cycling count more than walking
      let weightedDuration = duration;
      if (current.activity === 'running') {
        weightedDuration = duration * 1.5; // Running counts 1.5x
      } else if (current.activity === 'cycling') {
        weightedDuration = duration * 1.3; // Cycling counts 1.3x
      }
      
      activitySeconds += weightedDuration;
    }
  }
  
  return activitySeconds / 60; // Convert to minutes
}

/**
 * Calculate social interaction minutes from conversation data
 */
export function calculateSocialInteractionMinutesFromConversations(
  conversations: ConversationData[],
  date: Date = new Date()
): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  // Filter conversations for the given day
  const dayConversations = conversations.filter(
    (c) => c.timestamp >= dayStart && c.timestamp <= dayEnd
  );
  
  // Sum up conversation durations
  // Only count 'talking' and 'conversation' states, not 'silent'
  let interactionSeconds = 0;
  
  for (const conv of dayConversations) {
    if (conv.state === 'talking' || conv.state === 'conversation') {
      interactionSeconds += conv.duration;
    }
  }
  
  return interactionSeconds / 60; // Convert to minutes
}

/**
 * Get score interpretation text
 */
export function getScoreInterpretation(score: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  color: string;
  message: string;
} {
  if (score >= 80) {
    return {
      level: 'excellent',
      color: '#10B981', // green
      message: 'Excellent - Meeting recommended guidelines',
    };
  } else if (score >= 60) {
    return {
      level: 'good',
      color: '#3B82F6', // blue
      message: 'Good - Close to recommended levels',
    };
  } else if (score >= 40) {
    return {
      level: 'fair',
      color: '#F59E0B', // yellow
      message: 'Fair - Below recommended levels',
    };
  } else if (score >= 20) {
    return {
      level: 'poor',
      color: '#EF4444', // red
      message: 'Poor - Significantly below recommended levels',
    };
  } else {
    return {
      level: 'critical',
      color: '#DC2626', // dark red
      message: 'Critical - Well below minimum recommended levels',
    };
  }
}

/**
 * Generate friendly sample data for demo purposes
 */
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function generateSampleWellbeingData(days: number = 10): {
  dailyScores: DailyWellbeingScores[];
  currentScore: WellbeingScore;
} {
  const today = new Date();
  const dailyScores: DailyWellbeingScores[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Deterministic variation using sine waves
    const sleepBase = 85;
    const activityBase = 78;
    const socialBase = 72;

    const sleepVariation = Math.sin((i + 1) * 0.6) * 8;
    const activityVariation = Math.cos((i + 1) * 0.4) * 10;
    const socialVariation = Math.sin((i + 2) * 0.7) * 12;

    const sleep = clamp(sleepBase + sleepVariation, 70, 98);
    const physicalActivity = clamp(activityBase + activityVariation, 60, 95);
    const socialInteraction = clamp(socialBase + socialVariation, 55, 92);

    dailyScores.push({
      date: dateString,
      sleep: Number(sleep.toFixed(1)),
      physicalActivity: Number(physicalActivity.toFixed(1)),
      socialInteraction: Number(socialInteraction.toFixed(1)),
    });
  }

  // Sort newest first to match UI expectation
  dailyScores.sort((a, b) => b.date.localeCompare(a.date));

  const latest = dailyScores[0];
  const currentScore: WellbeingScore = {
    sleep: latest.sleep,
    physicalActivity: latest.physicalActivity,
    socialInteraction: latest.socialInteraction,
    overall: Number(calculateOverallScore({
      sleep: latest.sleep,
      physicalActivity: latest.physicalActivity,
      socialInteraction: latest.socialInteraction,
    }).toFixed(1)),
    lastUpdated: today,
  };

  return { dailyScores, currentScore };
}

