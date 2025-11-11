import { ThemedText as Text } from '@/components/themed-text';
import { ThemedView as View } from '@/components/themed-view';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { login } = useUser();

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsResetting(true);
    try {
      await supabase.auth.resetPasswordForEmail(email);
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email for password reset instructions.'
      );
      setEmail('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email Not Verified',
            'Please check your email for the verification link. You need to verify your email before logging in.',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert(
            'Invalid Credentials',
            'Please check your email and password and try again.',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        throw error;
      }

      if (data?.user) {
        const username = data.user.user_metadata?.username || data.user.email?.split('@')[0] || '';
        login(username, data.user.email || '', '********');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleForgotPassword}
          disabled={isResetting}
        >
          <Text style={[styles.link, isResetting && { opacity: 0.7 }]}>
            {isResetting ? 'Sending Email...' : 'Forgot Password?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.link}>
            Don't have an account? Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E9DA',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#424242',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: 'black',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#424242',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14
  }
});