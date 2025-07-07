import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { db, auth } from '../../firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import WhatsAppService from '../services/WhatsAppService';

export default function ClienteHome({ navigation }) {
  const [barbeiros, setBarbeiros] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchBarbeiros(), fetchAgendamentos()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbeiros = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'barbeiros'));
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setBarbeiros(data);
    } catch (error) {
      console.error('Erro ao buscar barbeiros:', error);
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) return;

      const q = query(
        collection(db, 'agendamentos'),
        where('cliente', '==', userEmail),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const agendar = async (barbeiro) => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      // Verificar se já existe agendamento pendente com este barbeiro
      const agendamentoPendente = agendamentos.find(
        ag => ag.barbeiroId === barbeiro.id && ag.status === 'pendente'
      );

      if (agendamentoPendente) {
        Alert.alert(
          'Agendamento Existente',
          'Você já possui um agendamento pendente com este barbeiro.'
        );
        return;
      }

      const dataAgendamento = new Date().toISOString().split('T')[0]; // Data atual como placeholder
      const horarioAgendamento = '14:00'; // Horário padrão como placeholder

      const novoAgendamento = {
        barbeiroId: barbeiro.id,
        barbeiroNome: barbeiro.nome,
        barbeiroTelefone: barbeiro.telefone || '5511999999999', // Telefone do barbeiro
        cliente: userEmail,
        clienteNome: userEmail.split('@')[0], // Usar parte do email como nome temporário
        status: 'pendente',
        createdAt: new Date(),
        data: dataAgendamento,
        horario: horarioAgendamento
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
        dataAgendamento,
        horarioAgendamento
      );

      const whatsappEnviado = await WhatsAppService.sendTextMessage(
        barbeiro.telefone || '5511999999999',
        mensagem
      );

      if (whatsappEnviado) {
        Alert.alert(
          'Sucesso!', 
          `Agendamento solicitado com ${barbeiro.nome}. Mensagem enviada via WhatsApp!`
        );
      } else {
        Alert.alert(
          'Agendamento Criado', 
          `Agendamento solicitado com ${barbeiro.nome}. Entre em contato para confirmar.`
        );
      }
      
      // Atualizar lista de agendamentos
      await fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao agendar:', error);
      Alert.alert('Erro', 'Não foi possível realizar o agendamento.');
    }
  };

  const renderBarbeiro = ({ item }) => (
    <View style={styles.barbeiroCard}>
      <View style={styles.barbeiroInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.nome ? item.nome.charAt(0).toUpperCase() : 'B'}
          </Text>
        </View>
        <View style={styles.barbeiroDetails}>
          <Text style={styles.barbeiroNome}>{item.nome || 'Barbeiro'}</Text>
          <Text style={styles.barbeiroEspecialidade}>
            {item.especialidade || 'Corte e barba'}
          </Text>
          <Text style={styles.barbeiroPreco}>
            R$ {item.preco || '25,00'}
          </Text>
        </View>
          <TouchableOpacity 
          style={styles.agendarButton} 
          onPress={() => navigation.navigate('Agendamento', { barbeiro: item })}
        >
          <Text style={styles.agendarButtonText}>Agendar</Text>
        </TouchableOpacity>
    </View>
  );

  const renderAgendamento = ({ item }) => (
    <View style={styles.agendamentoCard}>
      <View style={styles.agendamentoHeader}>
        <Text style={styles.agendamentoBarbeiro}>{item.barbeiroNome}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.agendamentoData}>
        📅 {item.data} às {item.horario}
      </Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Barbeiros Disponíveis</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.historicoButton}
            onPress={() => navigation.navigate('Historico')}
          >
            <Text style={styles.historicoButtonText}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => auth.signOut()}
          >
            <Text style={styles.profileButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={barbeiros}
        keyExtractor={item => item.id}
        renderItem={renderBarbeiro}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum barbeiro disponível</Text>
          </View>
        }
        ListHeaderComponent={
          agendamentos.length > 0 && (
            <View style={styles.agendamentosSection}>
              <Text style={styles.sectionTitle}>Meus Agendamentos</Text>
              {agendamentos.slice(0, 3).map(item => (
                <View key={item.id}>
                  {renderAgendamento({ item })}
                </View>
              ))}
              {agendamentos.length > 3 && (
                <TouchableOpacity style={styles.verMaisButton}>
                  <Text style={styles.verMaisText}>Ver todos</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
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
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  historicoButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  historicoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 14,
  },
  agendamentosSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  barbeiroCard: {
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
  barbeiroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  barbeiroDetails: {
    flex: 1,
  },
  barbeiroNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  barbeiroEspecialidade: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  barbeiroPreco: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 4,
  },
  agendarButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  agendarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agendamentoCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agendamentoBarbeiro: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
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
  agendamentoData: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  verMaisButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  verMaisText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

