import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Question {
  id: string;
  text: string;
  options: string[];
  allow_custom_answer: boolean;
  created_at: string;
}

interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  selected_option: string;
  custom_answer?: string;
  created_at: string;
}

const motivationalQuotes = [
  "Your feelings are valid. Take a moment to acknowledge them.",
  "Every day is a new beginning. Take a deep breath and start again.",
  "You are stronger than you think. Keep going, even small steps count.",
  "It's okay not to be okay. Reach out if you need support.",
  "Self-care is not selfish. It's essential for your well-being.",
  "Growth is a process, not an event. Be patient and kind to yourself.",
  "You are worthy of love and happiness.",
  "Even the darkest night will end and the sun will rise."
];

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
};

export default function HomeScreen() {
  // State management
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitted' | 'completed'>('idle');
  const [motivationalQuote, setMotivationalQuote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Context
  const { user, addHistoryEntry, lastSubmissionDate, setLastSubmissionDate } = useUser();

  // Monitor session changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadNewQuestion();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial question load
  useEffect(() => {
    const initQuestion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          loadNewQuestion();
        }
      } catch (error) {
        console.error('Error initializing question:', error);
      }
    };
    initQuestion();
  }, []);

  const loadNewQuestion = async () => {
    setSubmissionStatus('idle');
    setSelectedOption(null);
    setOtherText('');
    setIsLoading(true);

    try {
      // Get session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No active session found');
        Alert.alert('Session Error', 'Please log in again.');
        return;
      }

      // We want to keep all user answers, no matter what
      // Just check what questions they've answered so we don't repeat them

      // First get all the answered question IDs for this user
      const { data: answeredQuestions } = await supabase
        .from('user_answers')
        .select('question_id')
        .eq('user_id', session.user.id);

      const answeredIds = (answeredQuestions || []).map(a => a.question_id);

      // Get total number of questions
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // If user has answered all questions, show completion message
      if (count && answeredIds.length >= count) {
        setCurrentQuestion(null);
        setSubmissionStatus('completed');
        setMotivationalQuote("🎉 Congratulations! You've answered all available questions.\n\nHead over to the History tab to review your journey of self-reflection.");
        setIsLoading(false);
        return;
      }

      // Get all questions that haven't been answered
      const { data: unansweredQuestions, error: questionError } = await supabase
        .from('questions')
        .select('*');

      if (questionError) {
        throw questionError;
      }

      // Filter out answered questions
      const availableQuestions = unansweredQuestions.filter(
        q => !answeredIds.includes(q.id)
      );

      if (!availableQuestions.length) {
        throw new Error('No questions available');
      }

      // Get a random question from the unanswered ones
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const newQuestion = [availableQuestions[randomIndex]];

      setCurrentQuestion(newQuestion[0]);
    } catch (error) {
      console.error('Error loading question:', error);
      Alert.alert('Error', 'Failed to load question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for last submission date and load new question if needed
  useEffect(() => {
    const today = getTodayDateString();
    if (lastSubmissionDate === today) {
      // If already submitted today, show the motivational quote
      setSubmissionStatus('submitted');
      setCurrentQuestion(null);
      const randomQuoteIndex = Math.floor(Math.random() * motivationalQuotes.length);
      setMotivationalQuote(motivationalQuotes[randomQuoteIndex]);
      setIsLoading(false);
    } else {
      loadNewQuestion();
    }
  }, [lastSubmissionDate]);

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    // Validate state
    if (!currentQuestion) {
      Alert.alert('Error', 'Please wait for a question to load or try again.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to submit answers.');
      return;
    }

    if (!selectedOption) {
      Alert.alert('Error', 'Please choose an answer before submitting.');
      return;
    }

    if (selectedOption === 'Other' && otherText.trim() === '') {
      Alert.alert('Error', 'Please enter your custom option or select another.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        Alert.alert('Session Error', 'Please log in again to continue.');
        return;
      }

      const finalAnswer = selectedOption === 'Other' ? otherText.trim() : selectedOption;
      const questionId = currentQuestion.id;

      // Save to database
      const { error: insertError } = await supabase
        .from('user_answers')
        .insert({
          user_id: session.user.id,
          question_id: questionId,
          selected_option: finalAnswer,
          custom_answer: selectedOption === 'Other' ? finalAnswer : undefined,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      // Show success state and update history immediately
      addHistoryEntry({
        question: currentQuestion.text,
        answer: finalAnswer,
        timestamp: new Date()
      });
      
      setSubmissionStatus('submitted');
      setLastSubmissionDate(getTodayDateString());
      const randomQuoteIndex = Math.floor(Math.random() * motivationalQuotes.length);
      setMotivationalQuote(motivationalQuotes[randomQuoteIndex]);
    } catch (error) {
      console.error('Error saving answer:', error);
      Alert.alert('Error', 'Failed to save your answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#424242" />
          ) : submissionStatus === 'idle' ? (
            <>
              {currentQuestion ? (
                <View style={styles.questionCard}>
                  <Text style={styles.questionText}>{currentQuestion.text}</Text>
                  <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionButton,
                          selectedOption === option && styles.selectedOption,
                        ]}
                        onPress={() => setSelectedOption(option)}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedOption === option && styles.selectedOptionText
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {currentQuestion.allow_custom_answer && (
                      <View style={styles.otherOptionContainer}>
                        <TouchableOpacity
                          style={[
                            styles.optionButton,
                            selectedOption === 'Other' && styles.selectedOption,
                          ]}
                          onPress={() => setSelectedOption('Other')}
                        >
                          <Text style={[
                            styles.optionText,
                            selectedOption === 'Other' && styles.selectedOptionText
                          ]}>
                            Other
                          </Text>
                        </TouchableOpacity>
                        {selectedOption === 'Other' && (
                          <TextInput
                            style={styles.otherInput}
                            placeholder="Enter your answer..."
                            value={otherText}
                            onChangeText={setOtherText}
                          />
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.pageText}>Loading question...</Text>
              )}
            </>
          ) : submissionStatus === 'completed' ? (
            <View style={styles.submittedContainer}>
              <Text style={styles.motivationalText}>{motivationalQuote}</Text>
            </View>
          ) : (
            <View style={styles.submittedContainer}>
              <Text style={styles.motivationalText}>{motivationalQuote}</Text>
              <Text style={styles.submittedText}>
                You've already answered today's question. Come back tomorrow!
              </Text>
            </View>
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
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#424242',
    borderColor: '#424242',
  },
  optionText: {
    fontSize: 16,
    color: '#424242',
  },
  selectedOptionText: {
    color: '#fff',
  },
  otherOptionContainer: {
    marginTop: 10,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#424242',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#888',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pageText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
  },
  submittedContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  motivationalText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#424242',
    lineHeight: 32,
  },
  submittedText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
});