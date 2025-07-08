# Guia de Testes - Barbershop App

## Visão Geral

Este documento descreve a estratégia de testes implementada no aplicativo Barbershop, incluindo testes unitários, de integração e end-to-end (E2E).

## Estrutura de Testes

### 1. Testes Unitários (`__tests__/`)

Testam componentes e funções isoladamente:

- **Componentes**: `RatingComponent.test.js`
- **Serviços**: `WhatsAppService.test.js`
- **Telas**: `LoginScreen.test.js`
- **Hooks**: `useOptimizedFetch.test.js`

### 2. Testes E2E (`e2e/`)

Testam fluxos completos do usuário:

- **Login**: `login.test.js`
- **Agendamento**: `agendamento.test.js`

## Configuração

### Dependências de Teste

```bash
# Testes unitários
npm install --save-dev @testing-library/react-native @testing-library/jest-native

# Testes E2E
npm install --save-dev detox detox-cli
```

### Configuração Jest

O arquivo `jest.config.js` está configurado com:

- Preset React Native
- Setup files para mocks
- Transformações para módulos
- Cobertura de código (70% mínimo)

### Configuração Detox

O arquivo `.detoxrc.js` configura:

- Builds para iOS e Android
- Simuladores/emuladores
- Configurações de teste

## Executando Testes

### Testes Unitários

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Executar com cobertura
npm run test:coverage

# Executar para CI
npm run test:ci
```

### Testes E2E

```bash
# Instalar Detox CLI globalmente
npm install -g detox-cli

# Build do app para testes
detox build --configuration android.emu.debug

# Executar testes E2E
detox test --configuration android.emu.debug
```

## Mocks Implementados

### React Native

- `Alert.alert`
- `Linking.canOpenURL` e `Linking.openURL`
- `Platform.OS`

### Firebase

- Auth methods
- Firestore methods
- Messaging

### Stripe

- `initStripe`
- `presentPaymentSheet`
- `initPaymentSheet`

### AsyncStorage

- `getItem`, `setItem`, `removeItem`
- `getAllKeys`, `multiRemove`

## Estratégias de Teste

### 1. Testes de Componentes

```javascript
// Exemplo: Testando renderização
it('should render correctly when visible', () => {
  const { getByText } = render(
    <RatingComponent visible={true} agendamento={mockAgendamento} />
  );
  expect(getByText('Avaliar Atendimento')).toBeTruthy();
});

// Exemplo: Testando interações
it('should call onClose when cancel button is pressed', () => {
  const mockOnClose = jest.fn();
  const { getByText } = render(
    <RatingComponent onClose={mockOnClose} />
  );
  fireEvent.press(getByText('Cancelar'));
  expect(mockOnClose).toHaveBeenCalled();
});
```

### 2. Testes de Serviços

```javascript
// Exemplo: Testando formatação
it('should format Brazilian phone number correctly', () => {
  const formatted = WhatsAppService.formatPhoneNumber('11999999999');
  expect(formatted).toBe('5511999999999');
});

// Exemplo: Testando geração de mensagens
it('should generate correct appointment message', () => {
  const mensagem = WhatsAppService.gerarMensagemAgendamento(
    barbeiro, cliente, data, horario
  );
  expect(mensagem).toContain('João Silva');
  expect(mensagem).toContain('2024-01-15');
});
```

### 3. Testes de Hooks

```javascript
// Exemplo: Testando hook customizado
it('should fetch data successfully', async () => {
  const testData = { id: 1, name: 'Test' };
  mockFetchFunction.mockResolvedValue(testData);

  const { result, waitForNextUpdate } = renderHook(() =>
    useOptimizedFetch(mockFetchFunction, cacheKey)
  );

  await waitForNextUpdate();
  expect(result.current.data).toEqual(testData);
});
```

### 4. Testes E2E

```javascript
// Exemplo: Testando fluxo de login
it('should show login screen on app launch', async () => {
  await expect(element(by.text('Barbershop'))).toBeVisible();
  await expect(element(by.id('email-input'))).toBeVisible();
});

// Exemplo: Testando navegação
it('should navigate to agendamento screen', async () => {
  await element(by.id('agendar-button')).tap();
  await waitFor(element(by.text('Novo Agendamento')))
    .toBeVisible()
    .withTimeout(3000);
});
```

## Cobertura de Código

### Métricas Configuradas

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Relatório de Cobertura

```bash
npm run test:coverage
```

Gera relatório em `coverage/lcov-report/index.html`

## Boas Práticas

### 1. Nomenclatura

- Arquivos de teste: `*.test.js`
- Describe blocks: Descrever o que está sendo testado
- Test cases: Usar "should" para descrever comportamento esperado

### 2. Estrutura de Testes

```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup comum
  });

  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### 3. Mocks

- Sempre limpar mocks entre testes
- Usar mocks específicos para cada teste
- Verificar se mocks foram chamados corretamente

### 4. Async Testing

```javascript
// Para operações assíncronas
it('should handle async operations', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useAsyncHook());
  
  await waitForNextUpdate();
  
  expect(result.current.data).toBeDefined();
});
```

## Debugging de Testes

### 1. Logs

```javascript
// Adicionar logs temporários
console.log('Debug:', result.current);
```

### 2. Snapshot Testing

```javascript
// Para componentes visuais
expect(component).toMatchSnapshot();
```

### 3. Queries de Debug

```javascript
// Para encontrar elementos
const { debug } = render(<Component />);
debug(); // Mostra a árvore de elementos
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Scripts de Build

```bash
# Verificar testes antes do build
npm run test:ci && npm run build
```

## Próximos Passos

1. **Aumentar cobertura**: Adicionar mais testes unitários
2. **Performance testing**: Testes de performance com Flipper
3. **Visual regression**: Testes de regressão visual
4. **Accessibility testing**: Testes de acessibilidade
5. **Load testing**: Testes de carga para APIs

## Recursos Úteis

- [Testing Library Docs](https://testing-library.com/docs/react-native-testing-library/intro)
- [Detox Documentation](https://github.com/wix/Detox)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)