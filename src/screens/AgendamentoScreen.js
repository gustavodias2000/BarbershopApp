import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import WhatsAppService from '../services/WhatsAppService';

export default function AgendamentoScreen({ route, navigation }) {
  const { barbeiro } = route.params;
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);

  // Horários disponíveis (9h às 18h)
  const horariosPadrao = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  // Gerar próximos 7 dias
  const getNextDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Pular domingos (0 = domingo)
      if (date.getDay() !== 0) {
        days.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('pt-BR', { 
            weekday: 'short', 
            day: '2-digit', 
            month: '2-digit' 
          })
        });
      }
    }
    return days;
  };

  const [availableDates] = useState(getNextDays());

  useEffect(() => {
    if (selectedDate) {
      fetchAgendamentosData();
    }
  }, [selectedDate]);

  const fetchAgendamentosData = async () => {
    try {
      const q = query(
        collection(db, 'agendamentos'),
        where('barbeiroId', '==', barbeiro.id),
        where('data', '==', selectedDate),
        where('status', 'in', ['pendente', 'confirmado'])
      );
      
      const querySnapshot = await getDocs(q);
      const agendamentos = querySnapshot.docs.map(doc => doc.data());
      
      setAgendamentosExistentes(agendamentos);
      
      // Filtrar horários disponíveis
      const horariosOcupados = agendamentos.map(ag => ag.horario);
      const horariosDisponiveis = horariosPadrao.filter(
        horario => !horariosOcupados.includes(horario)
      );
      
      setAvailableTimes(horariosDisponiveis);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const confirmarAgendamento = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Erro', 'Selecione uma data e horário.');
      return;
    }

    setLoading(true);
    
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      const novoAgendamento = {
        barbeiroId: barbeiro.id,
        barbeiroNome: barbeiro.nome,
        barbeiroTelefone: barbeiro.telefone || '5511999999999',
        cliente: userEmail,
        clienteNome: userEmail.split('@')[0],
        status: 'pendente',
        createdAt: new Date(),
        data: selectedDate,
        horario: selectedTime,
        servico: barbeiro.especialidade || 'Corte e barba',
        preco: barbeiro.preco || '25,00'
      };

      // Salvar no Firestore
      await addDoc(collection(db, 'agendamentos'), novoAgendamento);
      
      // Enviar mensagem via WhatsApp
      const clienteInfo = {
        nome: novoAgendamento.clienteNome,
        email: userEmail
      };

      const mensagem = WhatsAppService.gerarMensagemAgendamento(
        barbeiro,
        clienteInfo,
        selectedDate,
        selectedTime
      );

      const whatsappEnviado = await WhatsAppService.sendTextMessage(
        barbeiro.telefone || '5511999999999',
        mensagem
      );

      if (whatsappEnviado) {
        Alert.alert(
          'Sucesso!', 
          `Agendamento solicitado para ${selectedDate} às ${selectedTime}. Mensagem enviada via WhatsApp!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Agendamento Criado', 
          `Agendamento solicitado para ${selectedDate} às ${selectedTime}. Entre em contato para confirmar.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Erro ao agendar:', error);
      Alert.alert('Erro', 'Não foi possível realizar o agendamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agendar com {barbeiro.nome}</Text>
        <Text style={styles.subtitle}>{barbeiro.especialidade || 'Corte e barba'}</Text>
        <Text style={styles.price}>R$ {barbeiro.preco || '25,00'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selecione a Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {availableDates.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateButton,
                selectedDate === day.date && styles.selectedDateButton
              ]}
              onPress={() => setSelectedDate(day.date)}
            >
              <Text style={[
                styles.dateButtonText,
                selectedDate === day.date && styles.selectedDateButtonText
              ]}>
                {day.display}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o Horário</Text>
          {availableTimes.length > 0 ? (
            <View style={styles.timeGrid}>
              {availableTimes.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeButton,
                    selectedTime === time && styles.selectedTimeButton
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    selectedTime === time && styles.selectedTimeButtonText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noTimesContainer}>
              <Text style={styles.noTimesText}>
                Não há horários disponíveis para esta data
              </Text>
            </View>
          )}
        </View>
      )}

      {selectedDate && selectedTime && (
        <View style={styles.confirmSection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo do Agendamento</Text>
            <Text style={styles.summaryText}>Barbeiro: {barbeiro.nome}</Text>
            <Text style={styles.summaryText}>Data: {selectedDate}</Text>
            <Text style={styles.summaryText}>Horário: {selectedTime}</Text>
            <Text style={styles.summaryText}>Serviço: {barbeiro.especialidade || 'Corte e barba'}</Text>
            <Text style={styles.summaryPrice}>Valor: R$ {barbeiro.preco || '25,00'}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={confirmarAgendamento}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  dateScroll: {
    flexDirection: 'row',
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedDateButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
  selectedDateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 70,
  },
  selectedTimeButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
  selectedTimeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noTimesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTimesText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  confirmSection: {
    margin: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 4,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

