import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

type Question = Database['public']['Tables']['questions']['Row'];
type UserAnswer = Database['public']['Tables']['user_answers']['Row'] & {
  questions: Question;
};

type HistoryEntry = {
  question: string;
  answer: string;
  timestamp: string;
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Fetch history whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const fetchHistory = async () => {
        if (!isMounted) return;
        setLoading(true);
        
        setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            setLoading(false);
            return;
          }

          const { data: answers, error } = await supabase
            .from('user_answers')
            .select(`
              *,
              questions:questions(*)
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (answers && isMounted) {
            // Filter out PHQ-9 questions
            const filteredAnswers = (answers as UserAnswer[]).filter(
              answer => answer.questions.category !== 'PHQ9'
            );
            
            const formattedHistory = filteredAnswers.map(answer => ({
              question: answer.questions.text,
              answer: answer.custom_answer || answer.selected_option,
              timestamp: answer.created_at
            }));
            setHistory(formattedHistory);
          }
        } catch (error) {
          console.error('Error fetching history:', error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      fetchHistory();

      // Cleanup function to prevent setting state on unmounted component
      return () => {
        isMounted = false;
      };
    }, []) // Empty dependency array since we want to run this every time the screen is focused
  );

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#424242" />
          ) : history.length > 0 ? (
            history.map((entry, index) => (
              <View key={index} style={styles.historyEntry}>
                <Text style={styles.historyQuestion}>Q: {entry.question}</Text>
                <Text style={styles.historyAnswer}>A: {entry.answer}</Text>
                <Text style={styles.historyTimestamp}>Date: {new Date(entry.timestamp).toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.pageText}>No history entries yet. Submit some answers on the Home page!</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5E9DA',
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#424242',
  },
  scrollViewContent: {
    paddingTop: 180,
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  contentContainer: {
    // No specific alignment needed here as history entries will stack vertically
  },
  historyEntry: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 5,
  },
  historyAnswer: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 5,
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  pageText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
  },
});

