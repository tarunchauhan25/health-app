import { supabase } from '@/lib/supabase';
import {
  DailyWellbeingScores,
  WellbeingMetrics,
  WellbeingScore,
  calculateDailyScores,
  calculateExponentiallyWeightedScore,
  calculateOverallScore,
  generateSampleWellbeingData,
} from '@/lib/wellbeingScoring';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface WellbeingContextType {
  // Current scores
  currentScores: WellbeingScore | null;
  isLoading: boolean;
  isUsingSampleData: boolean;
  
  // Historical data
  dailyScores: DailyWellbeingScores[];
  
  // Functions
  updateScores: (metrics: WellbeingMetrics) => Promise<void>;
  refreshScores: () => Promise<void>;
  getScoreHistory: (days: number) => DailyWellbeingScores[];
}

const WellbeingContext = createContext<WellbeingContextType | undefined>(undefined);

const STORAGE_KEY = '@wellbeing_scores';
const STORAGE_KEY_DAILY = '@wellbeing_daily_scores';

export function WellbeingProvider({ children }: { children: React.ReactNode }) {
  const [currentScores, setCurrentScores] = useState<WellbeingScore | null>(null);
  const [dailyScores, setDailyScores] = useState<DailyWellbeingScores[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsingSampleData, setIsUsingSampleData] = useState<boolean>(false);

  const applySampleData = useCallback(() => {
    const { currentScore, dailyScores: sampleDaily } = generateSampleWellbeingData(10);
    setCurrentScores(currentScore);
    setDailyScores(sampleDaily);
    setIsUsingSampleData(true);
  }, []);

  const loadScores = useCallback(async () => {
    try {
      setIsLoading(true);
      let dataLoaded = false;
      
      // Load current scores
      const scoresJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (scoresJson) {
        const scores = JSON.parse(scoresJson);
        setCurrentScores({
          ...scores,
          lastUpdated: new Date(scores.lastUpdated),
        });
        dataLoaded = true;
        setIsUsingSampleData(false);
      }
      
      // Load daily scores
      const dailyJson = await AsyncStorage.getItem(STORAGE_KEY_DAILY);
      if (dailyJson) {
        const daily = JSON.parse(dailyJson);
        setDailyScores(daily.map((d: any) => ({
          ...d,
          date: d.date,
        })));
        if ((daily as any[]).length > 0) {
          dataLoaded = true;
        }
      }

      if (!dataLoaded) {
        applySampleData();
      }
    } catch (error) {
      console.error('Error loading wellbeing scores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applySampleData]);

  // Load scores from storage on mount
  useEffect(() => {
    loadScores();
  }, [loadScores]);

  // Save scores to AsyncStorage
  const saveScores = async (scores: WellbeingScore, daily: DailyWellbeingScores[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
      await AsyncStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(daily));
    } catch (error) {
      console.error('Error saving wellbeing scores:', error);
    }
  };

  // Update scores with new metrics
  const updateScores = useCallback(async (metrics: WellbeingMetrics) => {
    try {
      const baselineScores = isUsingSampleData ? null : currentScores;
      const baselineDaily = isUsingSampleData ? [] : dailyScores;

      // Calculate today's daily scores
      const todayScores = calculateDailyScores(metrics);
      
      // Get or initialize current scores
      let updatedScores: WellbeingScore;
      
      if (baselineScores) {
        // Update with exponentially weighted average
        updatedScores = {
          sleep: calculateExponentiallyWeightedScore(
            baselineScores.sleep,
            todayScores.sleep
          ),
          physicalActivity: calculateExponentiallyWeightedScore(
            baselineScores.physicalActivity,
            todayScores.physicalActivity
          ),
          socialInteraction: calculateExponentiallyWeightedScore(
            baselineScores.socialInteraction,
            todayScores.socialInteraction
          ),
          overall: 0, // Will calculate below
          lastUpdated: new Date(),
        };
      } else {
        // First time, use today's scores directly
        updatedScores = {
          sleep: todayScores.sleep,
          physicalActivity: todayScores.physicalActivity,
          socialInteraction: todayScores.socialInteraction,
          overall: 0, // Will calculate below
          lastUpdated: new Date(),
        };
      }
      
      // Calculate overall score
      updatedScores.overall = calculateOverallScore(updatedScores);
      
      // Update daily scores array
      const updatedDailyScores = [...baselineDaily];
      const existingIndex = updatedDailyScores.findIndex(
        (d) => d.date === todayScores.date
      );
      
      if (existingIndex >= 0) {
        // Update existing day
        updatedDailyScores[existingIndex] = todayScores;
      } else {
        // Add new day
        updatedDailyScores.push(todayScores);
        // Keep only last 30 days
        if (updatedDailyScores.length > 30) {
          updatedDailyScores.shift();
        }
      }
      
      // Sort by date (newest first)
      updatedDailyScores.sort((a, b) => b.date.localeCompare(a.date));
      
      // Update state
      setCurrentScores(updatedScores);
      setDailyScores(updatedDailyScores);
      setIsUsingSampleData(false);
      
      // Save to storage
      await saveScores(updatedScores, updatedDailyScores);
      
      // Optionally sync to Supabase if user is logged in
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await syncToDatabase(updatedScores, todayScores);
        }
      } catch (error) {
        console.error('Error syncing to database:', error);
        // Don't fail if database sync fails
      }
    } catch (error) {
      console.error('Error updating wellbeing scores:', error);
    }
  }, [currentScores, dailyScores, isUsingSampleData]);

  // Sync scores to Supabase database
  const syncToDatabase = async (
    scores: WellbeingScore,
    dailyScore: DailyWellbeingScores
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Upsert daily score
      const { error: dailyError } = await supabase
        .from('wellbeing_daily_scores')
        .upsert({
          user_id: session.user.id,
          date: dailyScore.date,
          sleep_score: dailyScore.sleep,
          physical_activity_score: dailyScore.physicalActivity,
          social_interaction_score: dailyScore.socialInteraction,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        });

      if (dailyError) {
        console.error('Error saving daily score to database:', dailyError);
      }

      // Update or insert current wellbeing score
      const { error: scoreError } = await supabase
        .from('wellbeing_scores')
        .upsert({
          user_id: session.user.id,
          sleep_score: scores.sleep,
          physical_activity_score: scores.physicalActivity,
          social_interaction_score: scores.socialInteraction,
          overall_score: scores.overall,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (scoreError) {
        console.error('Error saving wellbeing score to database:', scoreError);
      }
    } catch (error) {
      console.error('Error syncing to database:', error);
    }
  };

  // Refresh scores from database
  const refreshScores = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        await loadScores(); // Load from local storage or sample
        return;
      }

      // Load current scores from database
      const { data: scoreData, error: scoreError } = await supabase
        .from('wellbeing_scores')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!scoreError && scoreData) {
        const scores: WellbeingScore = {
          sleep: scoreData.sleep_score,
          physicalActivity: scoreData.physical_activity_score,
          socialInteraction: scoreData.social_interaction_score,
          overall: scoreData.overall_score,
          lastUpdated: new Date(scoreData.last_updated),
        };
        setCurrentScores(scores);
      }

      // Load daily scores from database (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: dailyData, error: dailyError } = await supabase
        .from('wellbeing_daily_scores')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!dailyError && dailyData) {
        const daily = dailyData.map((d) => ({
          date: d.date,
          sleep: d.sleep_score,
          physicalActivity: d.physical_activity_score,
          socialInteraction: d.social_interaction_score,
        }));
        setDailyScores(daily);
        
        // Save to local storage
        if (currentScores && !isUsingSampleData) {
          await saveScores(currentScores, daily);
        }
      }
    } catch (error) {
      console.error('Error refreshing wellbeing scores:', error);
      await loadScores(); // Fallback to local storage/sample
    } finally {
      setIsLoading(false);
    }
  }, [currentScores, isUsingSampleData, loadScores]);

  // Get score history for specified number of days
  const getScoreHistory = useCallback((days: number): DailyWellbeingScores[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
    
    return dailyScores
      .filter((score) => score.date >= cutoffDateString)
      .slice(0, days)
      .reverse(); // Oldest first for charting
  }, [dailyScores]);

  return (
    <WellbeingContext.Provider
      value={{
        currentScores,
        isLoading,
        isUsingSampleData,
        dailyScores,
        updateScores,
        refreshScores,
        getScoreHistory,
      }}
    >
      {children}
    </WellbeingContext.Provider>
  );
}

export function useWellbeing() {
  const context = useContext(WellbeingContext);
  if (context === undefined) {
    throw new Error('useWellbeing must be used within a WellbeingProvider');
  }
  return context;
}

