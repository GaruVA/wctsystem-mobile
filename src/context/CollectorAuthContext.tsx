import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API configuration
const API_IP = '192.168.1.22'; 
const API_PORT = '5000';
const API_BASE = `http://${API_IP}:${API_PORT}/api`;

// Login API call for collector
const loginCollector = async (username: string, password: string) => {
  console.log('CollectorAPI: Attempting login for user:', username);
  try {
    const response = await axios.post(`${API_BASE}/collector/login`, { username, password });
    console.log('CollectorAPI: Login successful, received token');
    return response.data;
  } catch (error) {
    console.error('CollectorAPI: Login failed:', error);
    throw error;
  }
};

interface CollectorAuthContextData {
  token: string | null;
  loading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const CollectorAuthContext = createContext<CollectorAuthContextData>({} as CollectorAuthContextData);

export const CollectorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token from storage when app starts
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@collector_auth_token');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (e) {
        console.error('CollectorAuthProvider: Failed to load token from storage', e);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginCollector(username, password);
      
      const newToken = response.token;
      setToken(newToken);
      await AsyncStorage.setItem('@collector_auth_token', newToken);
    } catch (e: any) {
      console.error('CollectorAuthProvider: Sign in failed', e);
      setError(e.response?.data?.message || 'Failed to sign in');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setToken(null);
      await AsyncStorage.removeItem('@collector_auth_token');
    } catch (e) {
      console.error('CollectorAuthProvider: Failed to remove token from storage', e);
    }
  };

  const contextValue: CollectorAuthContextData = {
    token,
    loading,
    error,
    signIn,
    signOut,
  };

  return (
    <CollectorAuthContext.Provider value={contextValue}>
      {children}
    </CollectorAuthContext.Provider>
  );
};

export const useCollectorAuth = () => {
  const context = useContext(CollectorAuthContext);
  if (!context) {
    throw new Error('useCollectorAuth must be used within a CollectorAuthProvider');
  }
  return context;
};