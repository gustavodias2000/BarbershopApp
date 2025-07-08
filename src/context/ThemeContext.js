import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const lightTheme = {
  colors: {
    primary: '#3498db',
    secondary: '#2c3e50',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    border: '#ddd',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db'
  }
};

export const darkTheme = {
  colors: {
    primary: '#3498db',
    secondary: '#ecf0f1',
    background: '#1a1a1a',
    surface: '#2c2c2c',
    text: '#ecf0f1',
    textSecondary: '#bdc3c7',
    border: '#444',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db'
  }
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
        if (savedTheme !== 'system') {
          setIsDarkMode(savedTheme === 'dark');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de tema:', error);
    }
  };

  const toggleTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('themeMode', mode);
      
      if (mode === 'light') {
        setIsDarkMode(false);
      } else if (mode === 'dark') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{
      theme,
      isDarkMode,
      themeMode,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};