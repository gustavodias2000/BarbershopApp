import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import ClienteHome from './src/screens/ClienteHome';
import BarbeiroHome from './src/screens/BarbeiroHome';
import AgendamentoScreen from './src/screens/AgendamentoScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import PaymentScreen from './src/screens/PaymentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#3498db',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Cliente" 
            component={ClienteHome} 
            options={{ 
              title: 'Barbershop - Cliente',
              headerLeft: () => null // Remove botão voltar
            }}
          />
          <Stack.Screen 
            name="Barbeiro" 
            component={BarbeiroHome} 
            options={{ 
              title: 'Barbershop - Barbeiro',
              headerLeft: () => null // Remove botão voltar
            }}
          />
          <Stack.Screen 
            name="Agendamento" 
            component={AgendamentoScreen} 
            options={{ title: 'Novo Agendamento' }}
          />
          <Stack.Screen 
            name="Historico" 
            component={HistoricoScreen} 
            options={{ title: 'Histórico' }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen} 
            options={{ title: 'Pagamento' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

