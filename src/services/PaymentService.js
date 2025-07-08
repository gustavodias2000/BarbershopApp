import { Alert } from 'react-native';
import { initStripe, presentPaymentSheet, createPaymentMethod } from '@stripe/stripe-react-native';

class PaymentService {
  constructor() {
    this.isInitialized = false;
    this.publishableKey = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE'; // Substitua pela sua chave
    this.serverUrl = 'https://your-backend-url.com'; // Substitua pela URL do seu backend
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await initStripe({
        publishableKey: this.publishableKey,
        merchantIdentifier: 'merchant.com.barbershopapp', // Para Apple Pay
      });
      this.isInitialized = true;
      console.log('Stripe inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar Stripe:', error);
      throw error;
    }
  }

  /**
   * Processa pagamento para agendamento
   * @param {Object} agendamento - Dados do agendamento
   * @param {number} amount - Valor em centavos (ex: 2500 = R$ 25,00)
   * @returns {Promise<Object>} - Resultado do pagamento
   */
  async processPayment(agendamento, amount) {
    try {
      await this.initialize();

      // 1. Criar Payment Intent no backend
      const paymentIntent = await this.createPaymentIntent(amount, agendamento);

      // 2. Configurar Payment Sheet
      const { error: initError } = await this.initializePaymentSheet(paymentIntent);
      
      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Apresentar Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        throw new Error(paymentError.message);
      }

      // 4. Pagamento bem-sucedido
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: amount / 100 // Converter de centavos para reais
      };

    } catch (error) {
      console.error('Erro no processamento do pagamento:', error);
      Alert.alert('Erro no Pagamento', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria Payment Intent no backend
   */
  async createPaymentIntent(amount, agendamento) {
    try {
      const response = await fetch(`${this.serverUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'brl',
          metadata: {
            agendamentoId: agendamento.id,
            barbeiroId: agendamento.barbeiroId,
            cliente: agendamento.cliente
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar payment intent');
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar payment intent:', error);
      throw error;
    }
  }

  /**
   * Inicializa Payment Sheet
   */
  async initializePaymentSheet(paymentIntent) {
    const { initPaymentSheet } = await import('@stripe/stripe-react-native');
    
    return await initPaymentSheet({
      merchantDisplayName: 'Barbershop App',
      paymentIntentClientSecret: paymentIntent.client_secret,
      defaultBillingDetails: {
        name: 'Cliente',
      },
      allowsDelayedPaymentMethods: true,
      returnURL: 'barbershopapp://payment-return',
    });
  }

  /**
   * Processa reembolso (deve ser chamado do backend)
   */
  async requestRefund(paymentIntentId, amount, reason = 'requested_by_customer') {
    try {
      const response = await fetch(`${this.serverUrl}/create-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent: paymentIntentId,
          amount,
          reason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar reembolso');
      }

      return data;
    } catch (error) {
      console.error('Erro ao solicitar reembolso:', error);
      throw error;
    }
  }

  /**
   * Valida configuração do Stripe
   */
  validateConfiguration() {
    const errors = [];

    if (!this.publishableKey || this.publishableKey.includes('YOUR_STRIPE')) {
      errors.push('Chave pública do Stripe não configurada');
    }

    if (!this.serverUrl || this.serverUrl.includes('your-backend-url')) {
      errors.push('URL do backend não configurada');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formata valor para exibição
   */
  formatCurrency(amountInCents) {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  /**
   * Converte valor em reais para centavos
   */
  convertToCents(amountInReais) {
    return Math.round(amountInReais * 100);
  }
}

export default new PaymentService();