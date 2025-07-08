import { device, expect, element, by } from 'detox';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on app launch', async () => {
    await expect(element(by.text('Barbershop'))).toBeVisible();
    await expect(element(by.text('Faça seu login'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should show validation errors for invalid inputs', async () => {
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('password-input')).typeText('123');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Email inválido'))).toBeVisible();
    await expect(element(by.text('Senha deve ter pelo menos 6 caracteres'))).toBeVisible();
  });

  it('should navigate to cliente home for cliente email', async () => {
    await element(by.id('email-input')).typeText('cliente@teste.com');
    await element(by.id('password-input')).typeText('123456');
    await element(by.id('login-button')).tap();

    // Aguardar navegação (mock do Firebase Auth seria necessário)
    await waitFor(element(by.text('Barbeiros Disponíveis')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to barbeiro home for barbeiro email', async () => {
    await element(by.id('email-input')).typeText('barbeiro@teste.com');
    await element(by.id('password-input')).typeText('123456');
    await element(by.id('login-button')).tap();

    // Aguardar navegação (mock do Firebase Auth seria necessário)
    await waitFor(element(by.text('Painel do Barbeiro')))
      .toBeVisible()
      .withTimeout(5000);
  });
});