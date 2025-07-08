import { device, expect, element, by, waitFor } from 'detox';

describe('Agendamento Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Login como cliente
    await element(by.id('email-input')).typeText('cliente@teste.com');
    await element(by.id('password-input')).typeText('123456');
    await element(by.id('login-button')).tap();
    
    await waitFor(element(by.text('Barbeiros Disponíveis')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show available barbeiros', async () => {
    await expect(element(by.text('Barbeiros Disponíveis'))).toBeVisible();
    // Assumindo que há pelo menos um barbeiro cadastrado
    await expect(element(by.id('barbeiro-card')).atIndex(0)).toBeVisible();
  });

  it('should navigate to agendamento screen when agendar is tapped', async () => {
    await element(by.id('agendar-button')).atIndex(0).tap();
    
    await waitFor(element(by.text('Novo Agendamento')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should allow selecting date and time', async () => {
    await element(by.id('agendar-button')).atIndex(0).tap();
    
    await waitFor(element(by.text('Selecione a Data')))
      .toBeVisible()
      .withTimeout(3000);

    // Selecionar primeira data disponível
    await element(by.id('date-button')).atIndex(0).tap();
    
    await waitFor(element(by.text('Selecione o Horário')))
      .toBeVisible()
      .withTimeout(2000);

    // Selecionar primeiro horário disponível
    await element(by.id('time-button')).atIndex(0).tap();
    
    await expect(element(by.text('Resumo do Agendamento'))).toBeVisible();
  });

  it('should show payment modal after confirming agendamento', async () => {
    await element(by.id('agendar-button')).atIndex(0).tap();
    
    // Selecionar data e horário
    await element(by.id('date-button')).atIndex(0).tap();
    await element(by.id('time-button')).atIndex(0).tap();
    
    // Confirmar agendamento
    await element(by.id('confirm-button')).tap();
    
    await waitFor(element(by.text('Confirmar Pagamento')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to historico screen', async () => {
    await element(by.id('historico-button')).tap();
    
    await waitFor(element(by.text('Histórico de Agendamentos')))
      .toBeVisible()
      .withTimeout(3000);
  });
});