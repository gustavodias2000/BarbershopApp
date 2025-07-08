import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import PaymentService from '../services/PaymentService';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function PaymentScreen({ route, navigation }) {
  const { agendamento } = route.params;
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const styles = createStyles(theme);

  const preco = parseFloat(agendamento?.preco?.replace(',', '.') || '25.00');
  const precoEmCentavos = PaymentService.convertToCents(preco);

  useEffect(() => {
    // Inicializar Stripe quando a tela carrega
    PaymentService.initialize().catch(console.error);
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const result = await PaymentService.processPayment(agendamento, precoEmCentavos);
      
      if (result.success) {
        // Atualizar agendamento no Firestore
        await updateDoc(doc(db, 'agendamentos', agendamento.id), {
          status: 'pago',
          paymentIntentId: result.paymentIntentId,
          paidAt: new Date(),
          paidAmount: result.amount
        });

        Alert.alert(
          'Pagamento Realizado!',
          `Pagamento de ${PaymentService.formatCurrency(precoEmCentavos)} realizado com sucesso!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else if (result.canceled) {
        console.log('Pagamento cancelado pelo usuário');
      } else {
        Alert.alert('Erro', result.error || 'Erro no processamento do pagamento');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível processar o pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handlePresentialPayment = () => {
    Alert.alert(
      'Pagamento Presencial',
      'Confirma que o pagamento será realizado presencialmente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'agendamentos', agendamento.id), {
                status: 'confirmado',
                paymentMethod: 'presencial',
                confirmedAt: new Date()
              });
              
              Alert.alert(
                'Confirmado!',
                'Agendamento confirmado para pagamento presencial.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível confirmar o agendamento');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Finalizar Pagamento</Text>
      </View>

      <View style={styles.agendamentoCard}>
        <Text style={styles.cardTitle}>Detalhes do Agendamento</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Barbeiro:</Text>
          <Text style={styles.infoValue}>{agendamento.barbeiroNome}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data:</Text>
          <Text style={styles.infoValue}>{agendamento.data}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Horário:</Text>
          <Text style={styles.infoValue}>{agendamento.horario}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Serviço:</Text>
          <Text style={styles.infoValue}>{agendamento.servico || 'Corte e barba'}</Text>
        </View>
      </View>

      <View style={styles.precoCard}>
        <Text style={styles.precoLabel}>Total a pagar:</Text>
        <Text style={styles.precoValue}>
          {PaymentService.formatCurrency(precoEmCentavos)}
        </Text>
      </View>

      <View style={styles.paymentOptions}>
        <Text style={styles.optionsTitle}>Escolha a forma de pagamento:</Text>
        
        <TouchableOpacity
          style={styles.paymentButton}
          onPress={handlePayment}
          disabled={loading}
        >
          <Text style={styles.paymentButtonIcon}>💳</Text>
          <View style={styles.paymentButtonContent}>
            <Text style={styles.paymentButtonTitle}>Pagar com Cartão/PIX</Text>
            <Text style={styles.paymentButtonSubtitle}>
              Cartão de crédito, débito ou PIX
            </Text>
          </View>
          <Text style={styles.paymentButtonArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presentialButton}
          onPress={handlePresentialPayment}
        >
          <Text style={styles.presentialButtonIcon}>🏪</Text>
          <View style={styles.paymentButtonContent}>
            <Text style={styles.presentialButtonTitle}>Pagar Presencialmente</Text>
            <Text style={styles.presentialButtonSubtitle}>
              Dinheiro, cartão ou PIX no local
            </Text>
          </View>
          <Text style={styles.paymentButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.securityInfo}>
        <Text style={styles.securityTitle}>🔒 Pagamento Seguro</Text>
        <Text style={styles.securityText}>
          Seus dados estão protegidos com criptografia de ponta a ponta.
          Processamento seguro via Stripe.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  agendamentoCard: {
    backgroundColor: theme.colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  precoCard: {
    backgroundColor: theme.colors.success + '20',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  precoLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  precoValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginTop: 4,
  },
  paymentOptions: {
    margin: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  paymentButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentButtonContent: {
    flex: 1,
  },
  paymentButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  paymentButtonSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  paymentButtonArrow: {
    fontSize: 18,
    color: '#fff',
  },
  presentialButton: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  presentialButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  presentialButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  presentialButtonSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  securityInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});