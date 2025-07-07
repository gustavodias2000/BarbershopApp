import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { db, auth } from '../../firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import WhatsAppService from '../services/WhatsAppService';

export default function HistoricoScreen({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos'); // todos, pendentes, confirmados, cancelados

  useEffect(() => {
    fetchAgendamentos();
  }, [filtro]);

  const fetchAgendamentos = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) return;

      let q = query(
        collection(db, 'agendamentos'),
        where('cliente', '==', userEmail),
        orderBy('createdAt', 'desc')
      );

      if (filtro !== 'todos') {
        q = query(
          collection(db, 'agendamentos'),
          where('cliente', '==', userEmail),
          where('status', '==', filtro),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAgendamentos();
    setRefreshing(false);
  };

  const cancelarAgendamento = async (agendamento) => {
    Alert.alert(
      'Cancelar Agendamento',
      'Tem certeza que deseja cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const ref = doc(db, 'agendamentos', agendamento.id);
              await updateDoc(ref, {
                status: 'cancelado',
                cancelledAt: new Date(),
                cancelledBy: 'cliente'
              });

              // Enviar notificação para o barbeiro
              const mensagem = `Olá ${agendamento.barbeiroNome}! 

O cliente ${agendamento.clienteNome} cancelou o agendamento:

📅 Data: ${agendamento.data}
🕐 Horário: ${agendamento.horario}

Horário liberado para outros clientes.`;

              await WhatsAppService.sendTextMessage(
                agendamento.barbeiroTelefone || '5511999999999',
                mensagem
              );

              Alert.alert('Sucesso', 'Agendamento cancelado com sucesso.');
              await fetchAgendamentos();
            } catch (error) {
              console.error('Erro ao cancelar:', error);
              Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
            }
          }
        }
      ]
    );
  };

  const reagendar = (agendamento) => {
    // Navegar para tela de agendamento com dados do barbeiro
    const barbeiro = {
      id: agendamento.barbeiroId,
      nome: agendamento.barbeiroNome,
      telefone: agendamento.barbeiroTelefone,
      especialidade: agendamento.servico,
      preco: agendamento.preco
    };

    navigation.navigate('Agendamento', { barbeiro });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmado': return '#27ae60';
      case 'cancelado': return '#e74c3c';
      case 'concluido': return '#8e44ad';
      default: return '#f39c12';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      case 'concluido': return 'Concluído';
      default: return 'Pendente';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };

  const renderAgendamento = ({ item }) => (
    <View style={styles.agendamentoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.barbeiroInfo}>
          <Text style={styles.barbeiroNome}>{item.barbeiroNome}</Text>
          <Text style={styles.servico}>{item.servico || 'Corte e barba'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.agendamentoDetails}>
        <Text style={styles.dataHorario}>
          📅 {item.data} às {item.horario}
        </Text>
        <Text style={styles.preco}>💰 R$ {item.preco || '25,00'}</Text>
        <Text style={styles.criadoEm}>
          Criado em: {formatDate(item.createdAt)}
        </Text>
      </View>

      {item.status === 'pendente' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => cancelarAgendamento(item)}
          >
            <Text style={styles.actionButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {(item.status === 'cancelado' || item.status === 'concluido') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.reagendarButton]}
            onPress={() => reagendar(item)}
          >
            <Text style={styles.actionButtonText}>Reagendar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFiltros = () => (
    <View style={styles.filtrosContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'pendente', label: 'Pendentes' },
          { key: 'confirmado', label: 'Confirmados' },
          { key: 'cancelado', label: 'Cancelados' }
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filtroButton,
              filtro === item.key && styles.filtroButtonActive
            ]}
            onPress={() => setFiltro(item.key)}
          >
            <Text style={[
              styles.filtroButtonText,
              filtro === item.key && styles.filtroButtonTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Agendamentos</Text>
      </View>

      {renderFiltros()}

      <FlatList
        data={agendamentos}
        keyExtractor={item => item.id}
        renderItem={renderAgendamento}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filtro === 'todos' 
                ? 'Nenhum agendamento encontrado'
                : `Nenhum agendamento ${filtro} encontrado`
              }
            </Text>
            <Text style={styles.emptySubtext}>
              Seus agendamentos aparecerão aqui
            </Text>
          </View>
        }
        contentContainerStyle={agendamentos.length === 0 && styles.emptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filtroButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filtroButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  filtroButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  agendamentoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  barbeiroInfo: {
    flex: 1,
  },
  barbeiroNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  servico: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  agendamentoDetails: {
    marginBottom: 12,
  },
  dataHorario: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  preco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  criadoEm: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  reagendarButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
  },
});

