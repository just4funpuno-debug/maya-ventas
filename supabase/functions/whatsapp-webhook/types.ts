/**
 * Tipos TypeScript para webhooks de WhatsApp Cloud API
 * SUBFASE 1.5: Definiciones de tipos para payloads de WhatsApp
 */

// ============================================================================
// TIPOS DE WEBHOOK DE WHATSAPP
// ============================================================================

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

// ============================================================================
// CONTACTO
// ============================================================================

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

// ============================================================================
// MENSAJE
// ============================================================================

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  document?: {
    id: string;
    filename?: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  context?: {
    from: string;
    id: string;
    referred_product?: {
      catalog_id: string;
      product_retailer_id: string;
    };
  };
}

// ============================================================================
// STATUS (ESTADO DE MENSAJE)
// ============================================================================

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

// ============================================================================
// VERIFICACIÓN DE WEBHOOK (GET)
// ============================================================================

export interface WebhookVerificationQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

// ============================================================================
// RESPUESTAS
// ============================================================================

export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

