import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { db, auth } from '../../firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import WhatsAppService from '../services/WhatsAppService';

export default function BarbeiroHome({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendentes: 0,
    confirmados: 0,
    total: 0
  });

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const q = query(
        collection(db, 'agendamentos'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      setAgendamentos(data);
      
      // Calcular estatísticas
      const pendentes = data.filter(ag => ag.status === 'pendente').length;
      const confirmados = data.filter(ag => ag.status === 'confirmado').length;
      
      setStats({
        pendentes,
        confirmados,
        total: data.length
      });
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAgendamentos();
    setRefreshing(false);
  };

  const confirmar = async (agendamento) => {
    Alert.alert(
      'Confirmar Agendamento',
      `Confirmar agendamento de ${agendamento.clienteNome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              const ref = doc(db, 'agendamentos', agendamento.id);
              await updateDoc(ref, { 
                status: 'confirmado',
                confirmedAt: new Date()
              });
              
              // Enviar confirmação via WhatsApp
              const clienteInfo = {
                nome: agendamento.clienteNome,
                telefone: agendamento.clienteTelefone || '5511999999999' // Telefone do cliente
              };

              const barbeiroNome = auth.currentUser?.email?.split('@')[0] || 'Barbeiro';

              const mensagem = WhatsAppService.gerarMensagemConfirmacao(
                clienteInfo,
                agendamento.data,
                agendamento.horario,
                barbeiroNome
              );

              const whatsappEnviado = await WhatsAppService.sendTextMessage(
                clienteInfo.telefone,
                mensagem
              );

              if (whatsappEnviado) {
                Alert.alert('Sucesso!', 'Agendamento confirmado e cliente notificado via WhatsApp!');
              } else {
                Alert.alert('Sucesso!', 'Agendamento confirmado. Entre em contato com o cliente para informar.');
              }
              
              await fetchAgendamentos();
            } catch (error) {
              console.error('Erro ao confirmar agendamento:', error);
              Alert.alert('Erro', 'Não foi possível confirmar o agendamento.');
            }
          }
        }
      ]
    );
  };

  const cancelar = async (agendamento) => {
    Alert.alert(
      'Cancelar Agendamento',
      `Cancelar agendamento de ${agendamento.clienteNome}?`,
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
                cancelledAt: new Date()
              });
              
              // Enviar notificação de cancelamento via WhatsApp
              const clienteInfo = {
                nome: agendamento.clienteNome,
                telefone: agendamento.clienteTelefone || '5511999999999'
              };

              const mensagem = WhatsAppService.gerarMensagemCancelamento(
                clienteInfo,
                agendamento.data,
                agendamento.horario,
                'Reagendamento necessário' // Motivo padrão
              );

              const whatsappEnviado = await WhatsAppService.sendTextMessage(
                clienteInfo.telefone,
                mensagem
              );

              if (whatsappEnviado) {
                Alert.alert('Agendamento cancelado e cliente notificado via WhatsApp.');
              } else {
                Alert.alert('Agendamento cancelado. Entre em contato com o cliente para informar.');
              }
              
              await fetchAgendamentos();
            } catch (error) {
              console.error('Erro ao cancelar agendamento:', error);
              Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
            }
          }
        }
      ]
    );
  };

  const renderAgendamento = ({ item }) => (
    <View style={styles.agendamentoCard}>
      <View style={styles.agendamentoHeader}>
        <View style={styles.clienteInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.clienteNome ? item.clienteNome.charAt(0).toUpperCase() : 'C'}
            </Text>
          </View>
          <View style={styles.clienteDetails}>
            <Text style={styles.clienteNome}>{item.clienteNome || 'Cliente'}</Text>
            <Text style={styles.clienteEmail}>{item.cliente}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.agendamentoInfo}>
        <Text style={styles.agendamentoData}>
          📅 {item.data} às {item.horario}
        </Text>
        <Text style={styles.agendamentoCreated}>
          Solicitado em: {formatDate(item.createdAt)}
        </Text>
      </View>

      {item.status === 'pendente' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.confirmarButton]} 
            onPress={() => confirmar(item)}
          >
            <Text style={styles.actionButtonText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelarButton]} 
            onPress={() => cancelar(item)}
          >
            <Text style={styles.actionButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmado': return '#27ae60';
      case 'cancelado': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('pt-BR') + ' ' + 
             dateObj.toLocaleTimeString('pt-BR', { 
               hour: '2-digit', 
               minute: '2-digit' 
             });
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel do Barbeiro</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => auth.signOut()}
        >
          <Text style={styles.profileButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendentes}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.confirmados}</Text>
          <Text style={styles.statLabel}>Confirmados</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={agendamentos}
        keyExtractor={item => item.id}
        renderItem={renderAgendamento}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum agendamento encontrado</Text>
            <Text style={styles.emptySubtext}>
              Os agendamentos aparecerão aqui quando os clientes solicitarem
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
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
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clienteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clienteDetails: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clienteEmail: {
    fontSize: 14,
    color: '#7f8c8d',
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
  agendamentoInfo: {
    marginBottom: 12,
  },
  agendamentoData: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  agendamentoCreated: {
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
  confirmarButton: {
    backgroundColor: '#27ae60',
  },
  cancelarButton: {
    backgroundColor: '#e74c3c',
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
    paddingHorizontal: 40,
  },
});

