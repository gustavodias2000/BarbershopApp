import { PermissionsAndroid, Platform, Alert } from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';

class CalendarService {
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
          {
            title: 'Permissão de Calendário',
            message: 'O app precisa acessar seu calendário para criar lembretes de agendamentos.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const status = await RNCalendarEvents.requestPermissions();
        return status === 'authorized';
      }
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  async addAgendamentoToCalendar(agendamento) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permissão Negada',
          'Não foi possível adicionar ao calendário. Verifique as permissões.'
        );
        return false;
      }

      const startDate = new Date(`${agendamento.data}T${agendamento.horario}:00`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora depois

      const eventConfig = {
        title: `Barbershop - ${agendamento.barbeiroNome}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: `Agendamento com ${agendamento.barbeiroNome}\nServiço: ${agendamento.servico || 'Corte e barba'}`,
        location: 'Barbershop - [Inserir endereço]',
        alarms: [
          { date: -60 }, // 1 hora antes
          { date: -15 }  // 15 minutos antes
        ]
      };

      const eventId = await RNCalendarEvents.saveEvent(eventConfig.title, eventConfig);
      
      Alert.alert(
        'Sucesso!',
        'Agendamento adicionado ao seu calendário com lembretes.'
      );
      
      return eventId;
    } catch (error) {
      console.error('Erro ao adicionar ao calendário:', error);
      Alert.alert(
        'Erro',
        'Não foi possível adicionar o agendamento ao calendário.'
      );
      return false;
    }
  }

  async removeAgendamentoFromCalendar(eventId) {
    try {
      if (eventId) {
        await RNCalendarEvents.removeEvent(eventId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao remover do calendário:', error);
      return false;
    }
  }
}

export default new CalendarService();