import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Question = Database['public']['Tables']['questions']['Row'];

type PHQ9Answer = {
  questionId: string;
  questionText: string;
  answer: string;
  score: number;
};

// PHQ-9 scoring map
const PHQ9_SCORING: { [key: string]: number } = {
  'Not at all': 0,
  'Several days': 1,
  'More than half the days': 2,
  'Nearly every day': 3,
};

// Score interpretation with colors
const getScoreInfo = (score: number): { severity: string; color: string; description: string } => {
  if (score <= 4) {
    return {
      severity: 'Minimal',
      color: '#4CAF50', // Green
      description: 'Minimal depression',
    };
  } else if (score <= 9) {
    return {
      severity: 'Mild',
      color: '#FFC107', // Yellow/Amber
      description: 'Mild depression',
    };
  } else if (score <= 14) {
    return {
      severity: 'Moderate',
      color: '#FF9800', // Orange
      description: 'Moderate depression',
    };
  } else if (score <= 19) {
    return {
      severity: 'Moderately Severe',
      color: '#FF5722', // Deep Orange
      description: 'Moderately severe depression',
    };
  } else {
    return {
      severity: 'Severe',
      color: '#F44336', // Red
      description: 'Severe depression',
    };
  }
};

export default function PHQ9Screen() {
  const [loading, setLoading] = useState(true);
  const [surveyState, setSurveyState] = useState<'start' | 'inProgress' | 'completed'>('start');
  const [phq9Questions, setPhq9Questions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PHQ9Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);

  // Fetch PHQ-9 questions and check if already completed
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchPHQ9Data = async () => {
        if (!isMounted) return;
        setLoading(true);

        try {
          // Get current user session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            setLoading(false);
            return;
          }

          // Fetch PHQ-9 questions
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('category', 'PHQ9')
            .order('created_at', { ascending: true });

          if (questionsError) throw questionsError;

          if (questions && isMounted) {
            setPhq9Questions(questions);

            // Check if user has already completed PHQ-9
            const { data: existingAnswers, error: answersError } = await supabase
              .from('user_answers')
              .select(`
                *,
                questions:questions(*)
              `)
              .eq('user_id', session.user.id);

            if (answersError) throw answersError;

            // Filter PHQ-9 answers
            const phq9Answers = existingAnswers?.filter(
              (answer: any) => answer.questions?.category === 'PHQ9'
            ) || [];

            // If user has completed all 9 PHQ-9 questions, show results
            if (phq9Answers.length === 9) {
              const formattedAnswers: PHQ9Answer[] = phq9Answers.map((answer: any) => ({
                questionId: answer.question_id,
                questionText: answer.questions.text,
                answer: answer.selected_option,
                score: PHQ9_SCORING[answer.selected_option] || 0,
              }));

              const total = formattedAnswers.reduce((sum, ans) => sum + ans.score, 0);
              
              setAnswers(formattedAnswers);
              setTotalScore(total);
              setSurveyState('completed');
            } else {
              setSurveyState('start');
            }
          }
        } catch (error) {
          console.error('Error fetching PHQ-9 data:', error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      fetchPHQ9Data();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const startSurvey = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTotalScore(0);
    setSurveyState('inProgress');
  };

  const handleAnswerSubmit = () => {
    if (!selectedOption) return;

    const currentQuestion = phq9Questions[currentQuestionIndex];
    const score = PHQ9_SCORING[selectedOption] || 0;

    const newAnswer: PHQ9Answer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      answer: selectedOption,
      score,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // If this was the last question, calculate total score and move to completed
    if (currentQuestionIndex === phq9Questions.length - 1) {
      const total = updatedAnswers.reduce((sum, ans) => sum + ans.score, 0);
      setTotalScore(total);
      savePHQ9Answers(updatedAnswers, total);
      setSurveyState('completed');
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    }
  };

  const savePHQ9Answers = async (answersToSave: PHQ9Answer[], score: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Save each answer to the database
      const answerInserts = answersToSave.map(answer => ({
        user_id: session.user.id,
        question_id: answer.questionId,
        selected_option: answer.answer,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('user_answers').insert(answerInserts);

      if (error) {
        console.error('Error saving PHQ-9 answers:', error);
      }
    } catch (error) {
      console.error('Error in savePHQ9Answers:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PHQ-9</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#424242" />
        </View>
      </View>
    );
  }

  if (phq9Questions.length !== 9) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PHQ-9</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            PHQ-9 questionnaire is not properly configured. Expected 9 questions but found {phq9Questions.length}.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PHQ-9</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          {surveyState === 'start' && (
            <View style={styles.startContainer}>
              <Text style={styles.startTitle}>Patient Health Questionnaire (PHQ-9)</Text>
              <Text style={styles.startDescription}>
                The PHQ-9 is a brief questionnaire that assesses depression severity over the past 2 weeks.
              </Text>
              <Text style={styles.startDescription}>
                This survey contains 9 questions. Each question asks about symptoms you may have experienced.
              </Text>
              <Text style={styles.startDescription}>
                Please answer honestly. Your responses are confidential and will help track your mental health.
              </Text>
              <TouchableOpacity style={styles.startButton} onPress={startSurvey}>
                <Text style={styles.startButtonText}>Start Survey</Text>
              </TouchableOpacity>
            </View>
          )}

          {surveyState === 'inProgress' && (
            <View style={styles.questionContainer}>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Question {currentQuestionIndex + 1} of {phq9Questions.length}
                </Text>
              </View>
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {phq9Questions[currentQuestionIndex].text}
                </Text>
                <Text style={styles.timeframeText}>Over the last 2 weeks</Text>
                <View style={styles.optionsContainer}>
                  {phq9Questions[currentQuestionIndex].options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        selectedOption === option && styles.selectedOption,
                      ]}
                      onPress={() => setSelectedOption(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedOption === option && styles.selectedOptionText,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !selectedOption && styles.submitButtonDisabled,
                  ]}
                  onPress={handleAnswerSubmit}
                  disabled={!selectedOption}
                >
                  <Text style={styles.submitButtonText}>
                    {currentQuestionIndex === phq9Questions.length - 1 ? 'Finish' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {surveyState === 'completed' && (
            <View>
              <View style={[styles.scoreCard, { backgroundColor: getScoreInfo(totalScore).color }]}>
                <Text style={styles.scoreTitle}>Your PHQ-9 Score</Text>
                <Text style={styles.scoreValue}>{totalScore}</Text>
                <Text style={styles.scoreSeverity}>{getScoreInfo(totalScore).severity}</Text>
                <Text style={styles.scoreDescription}>{getScoreInfo(totalScore).description}</Text>
              </View>

              <View style={styles.answersContainer}>
                <Text style={styles.answersTitle}>Your Responses</Text>
                {answers.map((answer, index) => (
                  <View key={index} style={styles.answerCard}>
                    <Text style={styles.answerQuestion}>
                      {index + 1}. {answer.questionText}
                    </Text>
                    <Text style={styles.answerResponse}>
                      <Text style={styles.answerLabel}>Answer: </Text>
                      {answer.answer} (Score: {answer.score})
                    </Text>
                  </View>
                ))}
              </View>
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
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  startContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 15,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#424242',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  questionContainer: {
    flex: 1,
  },
  progressContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 10,
  },
  timeframeText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
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
  submitButton: {
    backgroundColor: '#424242',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreCard: {
    borderRadius: 8,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scoreTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  scoreSeverity: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  scoreDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  answersContainer: {
    marginBottom: 20,
  },
  answersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 15,
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  answerQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 5,
  },
  answerResponse: {
    fontSize: 14,
    color: '#666',
  },
  answerLabel: {
    fontWeight: '600',
    color: '#424242',
  },
});
