import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboard({ barbeiroId }) {
  const [analytics, setAnalytics] = useState({
    totalAgendamentos: 0,
    agendamentosHoje: 0,
    agendamentosSemana: 0,
    agendamentosMes: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0,
    faturamentoMes: 0,
    horariosPopulares: [],
    diasPopulares: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [barbeiroId]);

  const fetchAnalytics = async () => {
    try {
      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Buscar agendamentos
      const agendamentosQuery = query(
        collection(db, 'agendamentos'),
        where('barbeiroId', '==', barbeiroId),
        orderBy('createdAt', 'desc')
      );
      
      const agendamentosSnapshot = await getDocs(agendamentosQuery);
      const agendamentos = agendamentosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Buscar avaliações
      const avaliacoesQuery = query(
        collection(db, 'avaliacoes'),
        where('barbeiroId', '==', barbeiroId)
      );
      
      const avaliacoesSnapshot = await getDocs(avaliacoesQuery);
      const avaliacoes = avaliacoesSnapshot.docs.map(doc => doc.data());

      // Calcular métricas
      const totalAgendamentos = agendamentos.length;
      
      const agendamentosHoje = agendamentos.filter(ag => {
        const agData = new Date(ag.data);
        return agData.toDateString() === hoje.toDateString();
      }).length;

      const agendamentosSemana = agendamentos.filter(ag => {
        const agData = new Date(ag.createdAt.toDate());
        return agData >= inicioSemana;
      }).length;

      const agendamentosMes = agendamentos.filter(ag => {
        const agData = new Date(ag.createdAt.toDate());
        return agData >= inicioMes;
      }).length;

      const avaliacaoMedia = avaliacoes.length > 0 
        ? avaliacoes.reduce((sum, av) => sum + av.rating, 0) / avaliacoes.length
        : 0;

      // Calcular faturamento (assumindo preço padrão de R$ 25)
      const agendamentosConfirmados = agendamentos.filter(ag => 
        ag.status === 'confirmado' || ag.status === 'concluido'
      );
      const faturamentoMes = agendamentosConfirmados
        .filter(ag => {
          const agData = new Date(ag.createdAt.toDate());
          return agData >= inicioMes;
        })
        .reduce((sum, ag) => {
          const preco = parseFloat(ag.preco?.replace(',', '.') || '25');
          return sum + preco;
        }, 0);

      // Horários mais populares
      const horariosCount = {};
      agendamentos.forEach(ag => {
        horariosCount[ag.horario] = (horariosCount[ag.horario] || 0) + 1;
      });
      
      const horariosPopulares = Object.entries(horariosCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([horario, count]) => ({ horario, count }));

      setAnalytics({
        totalAgendamentos,
        agendamentosHoje,
        agendamentosSemana,
        agendamentosMes,
        avaliacaoMedia: Math.round(avaliacaoMedia * 10) / 10,
        totalAvaliacoes: avaliacoes.length,
        faturamentoMes,
        horariosPopulares
      });
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (title, value, subtitle, color = '#3498db') => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Resumo Geral</Text>
      
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Agendamentos Hoje',
          analytics.agendamentosHoje,
          'agendamentos',
          '#e74c3c'
        )}
        {renderMetricCard(
          'Esta Semana',
          analytics.agendamentosSemana,
          'agendamentos',
          '#f39c12'
        )}
      </View>

      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Este Mês',
          analytics.agendamentosMes,
          'agendamentos',
          '#27ae60'
        )}
        {renderMetricCard(
          'Total Geral',
          analytics.totalAgendamentos,
          'agendamentos',
          '#3498db'
        )}
      </View>

      <Text style={styles.sectionTitle}>Performance</Text>
      
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Avaliação Média',
          `${analytics.avaliacaoMedia}/5`,
          `${analytics.totalAvaliacoes} avaliações`,
          '#9b59b6'
        )}
        {renderMetricCard(
          'Faturamento Mês',
          `R$ ${analytics.faturamentoMes.toFixed(2)}`,
          'confirmados',
          '#27ae60'
        )}
      </View>

      {analytics.horariosPopulares.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Horários Mais Populares</Text>
          <View style={styles.popularTimesContainer}>
            {analytics.horariosPopulares.map((item, index) => (
              <View key={index} style={styles.popularTimeItem}>
                <Text style={styles.popularTimeHour}>{item.horario}</Text>
                <Text style={styles.popularTimeCount}>{item.count} agendamentos</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
  },
  popularTimesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  popularTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  popularTimeHour: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  popularTimeCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});