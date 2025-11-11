import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Text } from 'react-native';

type DbUser = Database['public']['Tables']['users']['Row'];

interface User extends Omit<DbUser, 'created_at' | 'updated_at'> {
  passwordHidden: string;
}

interface HistoryEntry {
  question: string;
  answer: string;
  timestamp: Date;
}

interface UserContextType {
  user: User | null;
  login: (username: string, email: string, passwordHidden: string) => void;
  logout: () => void;
  history: HistoryEntry[];
  addHistoryEntry: (entry: HistoryEntry) => void;
  lastSubmissionDate: string | null; // Added to track last submission
  setLastSubmissionDate: (date: string | null) => void; // Added to update last submission
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_KEY = 'user';
const HISTORY_KEY = 'history';
const LAST_SUBMISSION_DATE_KEY = 'lastSubmissionDate';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastSubmissionDate, setLastSubmissionDate] = useState<string | null>(null); // State for last submission date
  const [isLoading, setIsLoading] = useState(true); // New state to track loading status

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
          // Parse timestamps back to Date objects
          const parsedHistory = JSON.parse(storedHistory).map((entry: HistoryEntry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }));
          setHistory(parsedHistory);
        }

        const storedLastSubmissionDate = await AsyncStorage.getItem(LAST_SUBMISSION_DATE_KEY);
        if (storedLastSubmissionDate) {
          setLastSubmissionDate(storedLastSubmissionDate);
        }
      } catch (error) {
        console.error('Failed to load user data from AsyncStorage', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Save user data when it changes
  useEffect(() => {
    const saveUserData = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem(USER_KEY);
        }
      } catch (error) {
        console.error('Failed to save user to AsyncStorage', error);
      }
    };
    saveUserData();
  }, [user]);

  // Save history when it changes
  useEffect(() => {
    const saveHistoryData = async () => {
      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save history to AsyncStorage', error);
      }
    };
    saveHistoryData();
  }, [history]);

  // Save lastSubmissionDate when it changes
  useEffect(() => {
    const saveLastSubmissionDate = async () => {
      try {
        if (lastSubmissionDate) {
          await AsyncStorage.setItem(LAST_SUBMISSION_DATE_KEY, lastSubmissionDate);
        } else {
          await AsyncStorage.removeItem(LAST_SUBMISSION_DATE_KEY);
        }
      } catch (error) {
        console.error('Failed to save lastSubmissionDate to AsyncStorage', error);
      }
    };
    saveLastSubmissionDate();
  }, [lastSubmissionDate]);

  const login = async (username: string, email: string, passwordHidden: string) => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user?.id) {
        throw new Error('No authenticated user found');
      }

      const newUser: User = { 
        id: session.user.id,
        username, 
        email, 
        passwordHidden 
      };
      setUser(newUser);
      // Data is saved via useEffect listener
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setHistory([]);
    setLastSubmissionDate(null); // Clear last submission date on logout
    // Data is cleared via useEffect listeners
  };

  const addHistoryEntry = (entry: HistoryEntry) => {
    setHistory((prevHistory) => [...prevHistory, entry]);
    // History is saved via useEffect listener
  };

  if (isLoading) {
    return <Text>Loading user data...</Text>; // Or a loading spinner
  }

  return (
    <UserContext.Provider value={{ user, login, logout, history, addHistoryEntry, lastSubmissionDate, setLastSubmissionDate }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
