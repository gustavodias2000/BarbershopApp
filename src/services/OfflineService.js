import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.pendingOperations = [];
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      
      if (wasOffline && this.isOnline) {
        this.syncPendingOperations();
      }
    });
  }

  async saveOfflineData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
    }
  }

  async getOfflineData(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao recuperar dados offline:', error);
      return null;
    }
  }

  async addPendingOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });
    
    await AsyncStorage.setItem(
      'pendingOperations',
      JSON.stringify(this.pendingOperations)
    );
  }

  async syncPendingOperations() {
    try {
      const stored = await AsyncStorage.getItem('pendingOperations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }

      for (const operation of this.pendingOperations) {
        try {
          await this.executeOperation(operation);
        } catch (error) {
          console.error('Erro ao sincronizar operação:', error);
        }
      }

      this.pendingOperations = [];
      await AsyncStorage.removeItem('pendingOperations');
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'CREATE_AGENDAMENTO':
        await addDoc(collection(db, 'agendamentos'), operation.data);
        break;
      case 'UPDATE_AGENDAMENTO':
        const ref = doc(db, 'agendamentos', operation.id);
        await updateDoc(ref, operation.data);
        break;
      default:
        console.warn('Tipo de operação desconhecido:', operation.type);
    }
  }

  async createAgendamento(data) {
    if (this.isOnline) {
      return await addDoc(collection(db, 'agendamentos'), data);
    } else {
      await this.addPendingOperation({
        type: 'CREATE_AGENDAMENTO',
        data
      });
      
      // Salvar localmente para exibição imediata
      const localAgendamentos = await this.getOfflineData('agendamentos') || [];
      localAgendamentos.push({
        ...data,
        id: Date.now().toString(),
        offline: true
      });
      await this.saveOfflineData('agendamentos', localAgendamentos);
      
      return { id: Date.now().toString() };
    }
  }

  async updateAgendamento(id, data) {
    if (this.isOnline) {
      const ref = doc(db, 'agendamentos', id);
      return await updateDoc(ref, data);
    } else {
      await this.addPendingOperation({
        type: 'UPDATE_AGENDAMENTO',
        id,
        data
      });
      
      // Atualizar dados locais
      const localAgendamentos = await this.getOfflineData('agendamentos') || [];
      const index = localAgendamentos.findIndex(ag => ag.id === id);
      if (index !== -1) {
        localAgendamentos[index] = { ...localAgendamentos[index], ...data };
        await this.saveOfflineData('agendamentos', localAgendamentos);
      }
    }
  }

  isConnected() {
    return this.isOnline;
  }
}

export default new OfflineService();