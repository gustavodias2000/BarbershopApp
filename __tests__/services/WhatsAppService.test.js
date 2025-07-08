import WhatsAppService from '../../src/services/WhatsAppService';
import { Alert, Linking } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('WhatsAppService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('formatPhoneNumber', () => {
    it('should format Brazilian phone number correctly', () => {
      const formatted = WhatsAppService.formatPhoneNumber('11999999999');
      expect(formatted).toBe('5511999999999');
    });

    it('should keep already formatted number', () => {
      const formatted = WhatsAppService.formatPhoneNumber('5511999999999');
      expect(formatted).toBe('5511999999999');
    });

    it('should handle phone with special characters', () => {
      const formatted = WhatsAppService.formatPhoneNumber('(11) 99999-9999');
      expect(formatted).toBe('5511999999999');
    });
  });

  describe('gerarMensagemAgendamento', () => {
    it('should generate correct appointment message', () => {
      const barbeiro = {
        nome: 'João Silva',
        especialidade: 'Corte e barba'
      };
      const cliente = { nome: 'Maria' };
      const data = '2024-01-15';
      const horario = '14:00';

      const mensagem = WhatsAppService.gerarMensagemAgendamento(
        barbeiro, cliente, data, horario
      );

      expect(mensagem).toContain('João Silva');
      expect(mensagem).toContain('Maria');
      expect(mensagem).toContain('2024-01-15');
      expect(mensagem).toContain('14:00');
      expect(mensagem).toContain('Corte e barba');
    });
  });

  describe('sendTextMessage', () => {
    it('should use fallback when API is not configured', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(true);

      const result = await WhatsAppService.sendTextMessage(
        '11999999999',
        'Teste'
      );

      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalled();
      expect(Linking.openURL).toHaveBeenCalled();
    });

    it('should show alert when WhatsApp is not installed', async () => {
      Linking.canOpenURL.mockResolvedValue(false);

      const result = await WhatsAppService.sendTextMessage(
        '11999999999',
        'Teste'
      );

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'WhatsApp não encontrado',
        'Por favor, instale o WhatsApp para enviar mensagens.'
      );
    });
  });

  describe('gerarMensagemConfirmacao', () => {
    it('should generate correct confirmation message', () => {
      const cliente = { nome: 'Maria' };
      const data = '2024-01-15';
      const horario = '14:00';
      const barbeiroNome = 'João';

      const mensagem = WhatsAppService.gerarMensagemConfirmacao(
        cliente, data, horario, barbeiroNome
      );

      expect(mensagem).toContain('Maria');
      expect(mensagem).toContain('confirmado');
      expect(mensagem).toContain('João');
      expect(mensagem).toContain('2024-01-15');
      expect(mensagem).toContain('14:00');
    });
  });
});