/**
 * Utilidades de validación para WhatsApp CRM
 * SUBFASE 1.4: Validación de formularios de cuentas WhatsApp
 */

/**
 * Valida un Phone Number ID de WhatsApp
 * Formato esperado: Alphanumeric, longitud variable
 */
export function validatePhoneNumberId(phoneNumberId) {
  if (!phoneNumberId || typeof phoneNumberId !== 'string') {
    return { valid: false, error: 'Phone Number ID es requerido' };
  }
  
  const trimmed = phoneNumberId.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Phone Number ID no puede estar vacío' };
  }
  
  // WhatsApp Phone Number ID suele ser alfanumérico
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Phone Number ID contiene caracteres inválidos' };
  }
  
  return { valid: true };
}

/**
 * Valida un Business Account ID de WhatsApp
 */
export function validateBusinessAccountId(businessAccountId) {
  if (!businessAccountId || typeof businessAccountId !== 'string') {
    return { valid: false, error: 'Business Account ID es requerido' };
  }
  
  const trimmed = businessAccountId.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Business Account ID no puede estar vacío' };
  }
  
  return { valid: true };
}

/**
 * Valida un Access Token de WhatsApp
 * Debe tener longitud mínima razonable
 */
export function validateAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    return { valid: false, error: 'Access Token es requerido' };
  }
  
  const trimmed = accessToken.trim();
  if (trimmed.length < 50) {
    return { valid: false, error: 'Access Token parece inválido (muy corto)' };
  }
  
  return { valid: true };
}

/**
 * Valida un Verify Token
 */
export function validateVerifyToken(verifyToken) {
  if (!verifyToken || typeof verifyToken !== 'string') {
    return { valid: false, error: 'Verify Token es requerido' };
  }
  
  const trimmed = verifyToken.trim();
  if (trimmed.length < 10) {
    return { valid: false, error: 'Verify Token debe tener al menos 10 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Valida un número de teléfono
 * Formato: +[código país][número] o solo número
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { valid: false, error: 'Número de teléfono es requerido' };
  }
  
  const trimmed = phoneNumber.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Número de teléfono no puede estar vacío' };
  }
  
  // Formato básico: puede tener +, espacios, guiones, paréntesis
  // Limpiar y validar que tenga al menos 10 dígitos
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Número de teléfono debe tener al menos 10 dígitos' };
  }
  
  return { valid: true };
}

/**
 * Valida el nombre para mostrar
 */
export function validateDisplayName(displayName) {
  // Opcional, pero si se proporciona debe ser válido
  if (displayName === null || displayName === undefined || displayName === '') {
    return { valid: true }; // Opcional
  }
  
  if (typeof displayName !== 'string') {
    return { valid: false, error: 'Nombre debe ser texto' };
  }
  
  const trimmed = displayName.trim();
  if (trimmed.length > 100) {
    return { valid: false, error: 'Nombre no puede exceder 100 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Valida un UUID (para product_id)
 */
export function validateProductId(productId) {
  // Opcional
  if (!productId || productId === '') {
    return { valid: true };
  }
  
  // Formato UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return { valid: false, error: 'ID de producto no es un UUID válido' };
  }
  
  return { valid: true };
}

/**
 * Valida todos los campos de una cuenta WhatsApp
 * Retorna objeto con { valid: boolean, errors: {} }
 */
export function validateWhatsAppAccount(accountData) {
  const errors = {};
  
  const phoneNumberIdResult = validatePhoneNumberId(accountData.phone_number_id);
  if (!phoneNumberIdResult.valid) {
    errors.phone_number_id = phoneNumberIdResult.error;
  }
  
  const businessAccountIdResult = validateBusinessAccountId(accountData.business_account_id);
  if (!businessAccountIdResult.valid) {
    errors.business_account_id = businessAccountIdResult.error;
  }
  
  const accessTokenResult = validateAccessToken(accountData.access_token);
  if (!accessTokenResult.valid) {
    errors.access_token = accessTokenResult.error;
  }
  
  const verifyTokenResult = validateVerifyToken(accountData.verify_token);
  if (!verifyTokenResult.valid) {
    errors.verify_token = verifyTokenResult.error;
  }
  
  const phoneNumberResult = validatePhoneNumber(accountData.phone_number);
  if (!phoneNumberResult.valid) {
    errors.phone_number = phoneNumberResult.error;
  }
  
  const displayNameResult = validateDisplayName(accountData.display_name);
  if (!displayNameResult.valid) {
    errors.display_name = displayNameResult.error;
  }
  
  const productIdResult = validateProductId(accountData.product_id);
  if (!productIdResult.valid) {
    errors.product_id = productIdResult.error;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

