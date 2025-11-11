import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          <Text style={styles.pageText}>
            Welcome to your personal mental health companion. This application is designed to help you track and understand your mental well-being over time. Through a series of carefully crafted questions, we aim to gather insights into your mood, thoughts, and overall emotional state. Your responses will be used to provide you with a comprehensive review of your mental health, offering a clearer picture and helping you identify patterns. This tool is here to support you on your journey towards better mental well-being.
          </Text>
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
    paddingTop: 60, // Adjust this value based on desired spacing from the very top of the screen
    paddingHorizontal: 20,
    zIndex: 1, // Ensure header is above scrolling content
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#424242',
  },
  scrollViewContent: {
    paddingTop: 180, // Increased distance from header
    paddingHorizontal: 20,
  },
  contentContainer: {
    // Additional styling for content if needed
  },
  pageText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 10,
    textAlign: 'left',
  },
});

