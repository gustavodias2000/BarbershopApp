import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.configure();
  }

  async configure() {
    // Solicitar permissão para notificações
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await this.getFCMToken();
    }

    // Listener para mensagens em primeiro plano
    messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'Nova notificação',
        remoteMessage.notification?.body || 'Você tem uma nova mensagem'
      );
    });

    // Listener para quando o app é aberto via notificação
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });

    // Verificar se o app foi aberto por uma notificação quando estava fechado
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationNavigation(remoteMessage);
        }
      });
  }

  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      // Salvar token no Firestore para envio de notificações
      return token;
    } catch (error) {
      console.error('Erro ao obter FCM token:', error);
    }
  }

  handleNotificationNavigation(remoteMessage) {
    // Implementar navegação baseada no tipo de notificação
    const { data } = remoteMessage;
    
    if (data?.type === 'agendamento_confirmado') {
      // Navegar para histórico
    } else if (data?.type === 'novo_agendamento') {
      // Navegar para painel do barbeiro
    }
  }

  async sendNotification(token, title, body, data = {}) {
    // Esta função seria chamada do backend
    // Aqui apenas como referência da estrutura
    const message = {
      to: token,
      notification: {
        title,
        body,
      },
      data,
    };
    
    // Enviar via Firebase Admin SDK do backend
    return message;
  }
}

export default new NotificationService();