/**
 * Configuração da API do WhatsApp Business
 * 
 * INSTRUÇÕES PARA CONFIGURAÇÃO:
 * 
 * 1. Acesse https://developers.facebook.com/
 * 2. Crie uma conta de desenvolvedor Meta (se não tiver)
 * 3. Crie um novo app do tipo "Business"
 * 4. Adicione o produto "WhatsApp" ao seu app
 * 5. Configure um Business Portfolio
 * 6. Gere um Access Token
 * 7. Obtenha o Phone Number ID
 * 8. Substitua os valores abaixo pelos seus valores reais
 */

export const WHATSAPP_CONFIG = {
  // Token de acesso gerado no Meta for Developers
  // Navegue para: WhatsApp > API Setup > Generate access token
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN_HERE',
  
  // ID do número de telefone do WhatsApp Business
  // Encontrado em: WhatsApp > API Setup > From (número selecionado)
  PHONE_NUMBER_ID: 'YOUR_PHONE_NUMBER_ID_HERE',
  
  // Versão da API (recomendado manter atualizada)
  API_VERSION: 'v21.0',
  
  // URL base da API do Facebook Graph
  BASE_URL: 'https://graph.facebook.com',
  
  // Configurações de webhook (opcional)
  WEBHOOK_CONFIG: {
    // URL do seu webhook para receber notificações
    WEBHOOK_URL: 'YOUR_WEBHOOK_URL_HERE',
    
    // Token de verificação do webhook
    VERIFY_TOKEN: 'YOUR_WEBHOOK_VERIFY_TOKEN_HERE'
  },
  
  // Templates pré-aprovados (configure no Meta Business Manager)
  TEMPLATES: {
    // Template de boas-vindas (exemplo)
    HELLO_WORLD: 'hello_world',
    
    // Template de confirmação de agendamento (você precisa criar e aprovar)
    AGENDAMENTO_CONFIRMADO: 'agendamento_confirmado',
    
    // Template de lembrete (você precisa criar e aprovar)
    LEMBRETE_AGENDAMENTO: 'lembrete_agendamento',
    
    // Template de cancelamento (você precisa criar e aprovar)
    AGENDAMENTO_CANCELADO: 'agendamento_cancelado'
  },
  
  // Configurações de fallback
  FALLBACK: {
    // Se true, usa link direto do WhatsApp quando API falha
    USE_DIRECT_LINK: true,
    
    // Se true, mostra logs de debug
    DEBUG_MODE: __DEV__ || false
  }
};

/**
 * Valida se a configuração está completa
 * @returns {Object} Status da validação
 */
export const validateConfig = () => {
  const errors = [];
  const warnings = [];
  
  if (!WHATSAPP_CONFIG.ACCESS_TOKEN || WHATSAPP_CONFIG.ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    errors.push('ACCESS_TOKEN não configurado');
  }
  
  if (!WHATSAPP_CONFIG.PHONE_NUMBER_ID || WHATSAPP_CONFIG.PHONE_NUMBER_ID === 'YOUR_PHONE_NUMBER_ID_HERE') {
    errors.push('PHONE_NUMBER_ID não configurado');
  }
  
  if (WHATSAPP_CONFIG.WEBHOOK_CONFIG.WEBHOOK_URL === 'YOUR_WEBHOOK_URL_HERE') {
    warnings.push('Webhook não configurado (opcional)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configured: errors.length === 0
  };
};

/**
 * Obtém a configuração com validação
 * @returns {Object} Configuração validada
 */
export const getValidatedConfig = () => {
  const validation = validateConfig();
  
  if (WHATSAPP_CONFIG.FALLBACK.DEBUG_MODE) {
    console.log('WhatsApp Config Validation:', validation);
  }
  
  return {
    ...WHATSAPP_CONFIG,
    validation
  };
};

export default WHATSAPP_CONFIG;

