import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWellbeing } from '@/context/WellbeingContext';
import { getScoreInterpretation } from '@/lib/wellbeingScoring';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function WellbeingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const { currentScores, dailyScores, isLoading, refreshScores, isUsingSampleData } = useWellbeing();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshScores();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshScores();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#424242" />
          <ThemedText style={styles.loadingText}>Loading wellbeing scores...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!currentScores) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Wellbeing</ThemedText>
            <ThemedText style={styles.subtitle}>Your health at a glance</ThemedText>
          </View>
          
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No wellbeing data available yet.{'\n'}
              Start using the app to track your wellbeing!
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  const sleepInterpretation = getScoreInterpretation(currentScores.sleep);
  const activityInterpretation = getScoreInterpretation(currentScores.physicalActivity);
  const socialInterpretation = getScoreInterpretation(currentScores.socialInteraction);
  const overallInterpretation = getScoreInterpretation(currentScores.overall);

  // Prepare chart data (last 7 days)
  const chartData = dailyScores.slice(0, 7).reverse();
  const chartLabels = chartData.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const latestDay = dailyScores[0];
  const previousDay = dailyScores[1];

  const sleepDelta = latestDay && previousDay ? latestDay.sleep - previousDay.sleep : 0;
  const activityDelta = latestDay && previousDay ? latestDay.physicalActivity - previousDay.physicalActivity : 0;
  const socialDelta = latestDay && previousDay ? latestDay.socialInteraction - previousDay.socialInteraction : 0;

  const weeklyAverages = chartData.reduce(
    (acc, entry) => {
      return {
        sleep: acc.sleep + entry.sleep,
        activity: acc.activity + entry.physicalActivity,
        social: acc.social + entry.socialInteraction,
      };
    },
    { sleep: 0, activity: 0, social: 0 }
  );

  const chartLength = chartData.length || 1;
  weeklyAverages.sleep = weeklyAverages.sleep / chartLength;
  weeklyAverages.activity = weeklyAverages.activity / chartLength;
  weeklyAverages.social = weeklyAverages.social / chartLength;

  const highlightCards = [
    {
      label: 'Sleep trend',
      value: `${latestDay ? latestDay.sleep.toFixed(0) : '--'} pts`,
      delta: sleepDelta,
      description: 'quality vs yesterday',
    },
    {
      label: 'Movement streak',
      value: `${Math.min(dailyScores.length, 7)} days`,
      delta: activityDelta,
      description: 'active days this week',
    },
    {
      label: 'Social energy',
      value: `${latestDay ? latestDay.socialInteraction.toFixed(0) : '--'} pts`,
      delta: socialDelta,
      description: 'connection strength',
    },
  ];

  const recommendations = [
    {
      icon: '🌙',
      title: 'Wind-down ritual',
      detail: 'Keep bedtime around 10:45 PM for consistent recovery.',
      status: 'On track · 5/7 nights',
    },
    {
      icon: '🚶',
      title: 'Move every 2 hours',
      detail: 'Short walks keep activity score above 80.',
      status: 'Next reminder in 45 min',
    },
    {
      icon: '💬',
      title: 'Meaningful chat',
      detail: 'Aim for 15 min of focused conversation.',
      status: 'Great job yesterday!',
    },
  ];

  const chartConfig = {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    backgroundGradientFrom: isDark ? '#1E293B' : '#FFFFFF',
    backgroundGradientTo: isDark ? '#334155' : '#F8FAFC',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(66, 66, 66, ${opacity})`,
    labelColor: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#424242',
    },
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            tintColor="#424242"
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Wellbeing</ThemedText>
            <ThemedText style={styles.subtitle}>Your health at a glance</ThemedText>
          </View>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <Text style={styles.refreshButton}>{refreshing ? '...' : '↻'}</Text>
          </TouchableOpacity>
        </View>

        {isUsingSampleData && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerTitle}>Showing healthy baseline</Text>
            <Text style={styles.demoBannerText}>
              Live data will replace this preview as your sensors collect activity throughout the day.
            </Text>
          </View>
        )}

        {/* Overall Score Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={isDark ? ['#334155', '#475569'] : ['#FFFFFF', '#F1F5F9']}
            style={styles.cardGradient}
          >
            <View style={styles.overallScoreContainer}>
              <ThemedText style={styles.overallLabel}>Overall Wellbeing</ThemedText>
              <ThemedText style={[styles.overallScore, { color: overallInterpretation.color }]}>
                {currentScores.overall.toFixed(0)}
              </ThemedText>
              <ThemedText style={styles.overallInterpretation}>
                {overallInterpretation.message}
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Highlights */}
        <View style={styles.highlightGrid}>
          {highlightCards.map((card) => (
            <View key={card.label} style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>{card.label}</Text>
              <Text style={styles.highlightValue}>{card.value}</Text>
              <Text style={styles.highlightDescription}>{card.description}</Text>
              {card.delta !== 0 && (
                <Text
                  style={[
                    styles.highlightTrend,
                    card.delta >= 0 ? styles.trendPositive : styles.trendNegative,
                  ]}
                >
                  {card.delta >= 0 ? '▲' : '▼'} {Math.abs(card.delta).toFixed(1)} pts
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Individual Dimension Scores */}
        <View style={styles.dimensionsContainer}>
          {/* Sleep Score */}
          <View style={styles.dimensionCard}>
            <LinearGradient
              colors={[sleepInterpretation.color, sleepInterpretation.color + '80']}
              style={styles.dimensionGradient}
            >
              <View style={styles.dimensionContent}>
                <ThemedText style={styles.dimensionIcon}>😴</ThemedText>
                <ThemedText style={styles.dimensionLabel}>Sleep</ThemedText>
                <ThemedText style={styles.dimensionScore}>
                  {currentScores.sleep.toFixed(0)}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${currentScores.sleep}%`,
                        backgroundColor: sleepInterpretation.color,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.dimensionStatus}>
                  {sleepInterpretation.level.toUpperCase()}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>

          {/* Physical Activity Score */}
          <View style={styles.dimensionCard}>
            <LinearGradient
              colors={[activityInterpretation.color, activityInterpretation.color + '80']}
              style={styles.dimensionGradient}
            >
              <View style={styles.dimensionContent}>
                <ThemedText style={styles.dimensionIcon}>🏃</ThemedText>
                <ThemedText style={styles.dimensionLabel}>Activity</ThemedText>
                <ThemedText style={styles.dimensionScore}>
                  {currentScores.physicalActivity.toFixed(0)}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${currentScores.physicalActivity}%`,
                        backgroundColor: activityInterpretation.color,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.dimensionStatus}>
                  {activityInterpretation.level.toUpperCase()}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>

          {/* Social Interaction Score */}
          <View style={styles.dimensionCard}>
            <LinearGradient
              colors={[socialInterpretation.color, socialInterpretation.color + '80']}
              style={styles.dimensionGradient}
            >
              <View style={styles.dimensionContent}>
                <ThemedText style={styles.dimensionIcon}>💬</ThemedText>
                <ThemedText style={styles.dimensionLabel}>Social</ThemedText>
                <ThemedText style={styles.dimensionScore}>
                  {currentScores.socialInteraction.toFixed(0)}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${currentScores.socialInteraction}%`,
                        backgroundColor: socialInterpretation.color,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.dimensionStatus}>
                  {socialInterpretation.level.toUpperCase()}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Trend Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <LinearGradient
              colors={isDark ? ['#334155', '#475569'] : ['#FFFFFF', '#F1F5F9']}
              style={styles.cardGradient}
            >
              <ThemedText style={styles.chartTitle}>7-Day Trend</ThemedText>
              <LineChart
                data={{
                  labels: chartLabels.length > 0 ? chartLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [
                    {
                      data: chartData.map((d) => d.sleep),
                      color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                      strokeWidth: 2,
                    },
                    {
                      data: chartData.map((d) => d.physicalActivity),
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      strokeWidth: 2,
                    },
                    {
                      data: chartData.map((d) => d.socialInteraction),
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                  <ThemedText style={styles.legendText}>Sleep</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <ThemedText style={styles.legendText}>Activity</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <ThemedText style={styles.legendText}>Social</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Weekly snapshot */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>Weekly snapshot</Text>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Avg sleep score</Text>
              <Text style={styles.snapshotValue}>{weeklyAverages.sleep.toFixed(0)}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Avg activity score</Text>
              <Text style={styles.snapshotValue}>{weeklyAverages.activity.toFixed(0)}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Avg social score</Text>
              <Text style={styles.snapshotValue}>{weeklyAverages.social.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>Personalized nudges</Text>
          {recommendations.map((tip) => (
            <View key={tip.title} style={styles.recommendationRow}>
              <View style={styles.recommendationIcon}>
                <Text style={{ fontSize: 20 }}>{tip.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recommendationTitle}>{tip.title}</Text>
                <Text style={styles.recommendationDetail}>{tip.detail}</Text>
                <Text style={styles.recommendationStatus}>{tip.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Last Updated */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Last updated: {currentScores.lastUpdated.toLocaleString()}
          </ThemedText>
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/status')}
          >
            <Text style={styles.navButtonText}>View Activity Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#424242',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  demoBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  demoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  demoBannerText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  refreshButton: {
    fontSize: 24,
    color: '#424242',
  },
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 24,
    borderRadius: 20,
  },
  overallScoreContainer: {
    alignItems: 'center',
  },
  overallLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  overallScore: {
    fontSize: 64,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overallInterpretation: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  highlightGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  highlightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  highlightDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  highlightTrend: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  trendPositive: {
    color: '#059669',
  },
  trendNegative: {
    color: '#DC2626',
  },
  dimensionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dimensionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dimensionGradient: {
    padding: 16,
    borderRadius: 16,
  },
  dimensionContent: {
    alignItems: 'center',
  },
  dimensionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  dimensionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.9,
  },
  dimensionScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dimensionStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.8,
    letterSpacing: 1,
  },
  chartCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#424242',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  recommendationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  recommendationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recommendationDetail: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 2,
  },
  recommendationStatus: {
    fontSize: 12,
    color: '#059669',
    marginTop: 6,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  navigationContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  navButton: {
    backgroundColor: '#424242',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

