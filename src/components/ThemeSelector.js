import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelector({ visible, onClose }) {
  const { theme, themeMode, toggleTheme } = useTheme();

  const themeOptions = [
    { key: 'light', label: 'Claro', icon: '☀️' },
    { key: 'dark', label: 'Escuro', icon: '🌙' },
    { key: 'system', label: 'Sistema', icon: '⚙️' }
  ];

  const styles = createStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Escolher Tema</Text>
          
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionButton,
                themeMode === option.key && styles.selectedOption
              ]}
              onPress={() => {
                toggleTheme(option.key);
                onClose();
              }}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[
                styles.optionText,
                themeMode === option.key && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
              {themeMode === option.key && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedOption: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});