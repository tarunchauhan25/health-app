import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExploreScreen() {
  const router = useRouter();
  
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
        
        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.navButtonText}>Go to home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/phq9')}
          >
            <Text style={styles.navButtonText}>See your PHQ-9 score</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/sensors')}
          >
            <Text style={styles.navButtonText}>See live sensor data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/status')}
          >
            <Text style={styles.navButtonText}>Check activity status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/history')}
          >
            <Text style={styles.navButtonText}>View your history</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.navButtonText}>Go to profile</Text>
          </TouchableOpacity>
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
  navigationContainer: {
    marginTop: 30,
    marginBottom: 20,
    gap: 12,
  },
  navButton: {
    backgroundColor: '#424242',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

