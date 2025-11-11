import { useUser } from '@/context/UserContext'; // Import useUser
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useUser(); // Get user and logout from context

  // Default values if user is null (not logged in, though shouldn't happen here)
  const displayUserName = user?.username || 'Guest';
  const displayUserEmail = user?.email || 'No Email';
  const displayUserPassword = user?.passwordHidden || '********';

  const handleChangeEmail = () => {
    Alert.alert('Change Email', 'Feature to change email will be implemented here.');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Feature to change password will be implemented here.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => {
            logout(); // Clear user from context
            router.replace('/login'); // Navigate to login screen
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.contentContainer}>
          <View style={styles.infoSection}>
            <View style={styles.infoContainer}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{displayUserName}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{displayUserEmail}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.value}>{displayUserPassword}</Text>
            </View>
          </View>

          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => Alert.alert('Change Username', 'Feature to change username will be implemented here.')}
            >
              <Text style={styles.buttonText}>Change Username</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleChangeEmail}
            >
              <Text style={styles.buttonText}>Change Email</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleChangePassword}
            >
              <Text style={styles.buttonText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]} 
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    color: '#424242',
    fontWeight: '500',
  },
  buttonSection: {
    marginTop: 20,
  },
  actionButton: {
    width: '100%',
    backgroundColor: 'black',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#dc2626',
  },
});
