import CryptoJS from 'crypto-js';

interface EncryptedKey {
  encrypted: string;
  iv: string;
  salt: string;
  timestamp: number;
}

interface APIKeyConfig {
  id: string;
  provider: string;
  name: string;
  encryptedKey: EncryptedKey;
  lastUsed?: number;
  isActive: boolean;
  permissions: string[];
}

interface ProviderConfig {
  name: string;
  required: boolean;
  url?: string;
  models: string[];
}

class APIKeyManager {
  private readonly STORAGE_KEY = 'jarvis_api_keys';
  private readonly MASTER_KEY_SALT = 'jarvis-master-salt-2024';
  private masterKey: string | null = null;
  private memoryCache: Map<string, string> = new Map();

  // Provider configurations
  private readonly PROVIDERS: Record<string, ProviderConfig> = {
    openai: {
      name: 'OpenAI',
      required: true,
      url: 'https://api.openai.com',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    anthropic: {
      name: 'Anthropic',
      required: true,
      url: 'https://api.anthropic.com',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    },
    google: {
      name: 'Google',
      required: true,
      url: 'https://generativelanguage.googleapis.com',
      models: ['gemini-pro', 'gemini-pro-vision']
    },
    groq: {
      name: 'Groq',
      required: true,
      url: 'https://api.groq.com',
      models: ['mixtral-8x7b', 'llama2-70b']
    },
    perplexity: {
      name: 'Perplexity',
      required: true,
      url: 'https://api.perplexity.ai',
      models: ['pplx-70b', 'pplx-7b']
    },
    mistral: {
      name: 'Mistral',
      required: true,
      url: 'https://api.mistral.ai',
      models: ['mistral-large', 'mistral-medium', 'mistral-small']
    },
    ollama: {
      name: 'Ollama (Local)',
      required: false,
      url: 'http://localhost:11434',
      models: ['llama2', 'codellama', 'mistral']
    }
  };

  constructor() {
    this.initializeMasterKey();
  }

  private async initializeMasterKey(): Promise<void> {
    try {
      // Try to get master key from secure storage or generate new one
      const storedKey = localStorage.getItem('jarvis_master_key');
      if (storedKey) {
        this.masterKey = storedKey;
      } else {
        // Generate a new master key based on device fingerprint
        this.masterKey = await this.generateDeviceFingerprint();
        localStorage.setItem('jarvis_master_key', this.masterKey);
      }
    } catch (error) {
      console.error('Failed to initialize master key:', error);
      // Fallback to a generated key
      this.masterKey = CryptoJS.lib.WordArray.random(256/8).toString();
    }
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      new Date().getTimezoneOffset().toString(),
      this.MASTER_KEY_SALT
    ];
    
    const fingerprint = components.join('|');
    return CryptoJS.SHA256(fingerprint).toString();
  }

  private deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000,
      hasher: CryptoJS.algo.SHA256
    }).toString();
  }

  private encryptData(data: string, key: string): EncryptedKey {
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    const iv = CryptoJS.lib.WordArray.random(128/8).toString();
    const derivedKey = this.deriveKey(key, salt);
    
    const encrypted = CryptoJS.AES.encrypt(data, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encrypted: encrypted.toString(),
      iv,
      salt,
      timestamp: Date.now()
    };
  }

  private decryptData(encryptedKey: EncryptedKey, key: string): string {
    const derivedKey = this.deriveKey(key, encryptedKey.salt);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedKey.encrypted, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(encryptedKey.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  // Store API key securely
  async storeAPIKey(provider: string, apiKey: string, name?: string): Promise<APIKeyConfig> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const keyConfig: APIKeyConfig = {
      id: `${provider}_${Date.now()}`,
      provider,
      name: name || `${this.PROVIDERS[provider]?.name || provider} Key`,
      encryptedKey: this.encryptData(apiKey, this.masterKey),
      isActive: false,
      permissions: ['read', 'write'],
      lastUsed: undefined
    };

    // Store in localStorage
    const existingKeys = this.getStoredKeys();
    existingKeys.push(keyConfig);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingKeys));

    // Cache in memory for quick access
    this.memoryCache.set(keyConfig.id, apiKey);

    return keyConfig;
  }

  // Retrieve API key
  async getAPIKey(provider: string): Promise<string | null> {
    if (!this.masterKey) {
      console.warn('Master key not initialized');
      return null;
    }

    // Check memory cache first
    const cachedKey = this.memoryCache.get(provider);
    if (cachedKey) {
      return cachedKey;
    }

    // Check stored keys
    const keys = this.getStoredKeys();
    const activeKey = keys.find(k => k.provider === provider && k.isActive);
    
    if (activeKey) {
      try {
        const decryptedKey = this.decryptData(activeKey.encryptedKey, this.masterKey);
        
        // Update last used timestamp
        activeKey.lastUsed = Date.now();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
        
        // Cache for future use
        this.memoryCache.set(provider, decryptedKey);
        
        return decryptedKey;
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        return null;
      }
    }

    return null;
  }

  // Get all stored keys (without decryption)
  getStoredKeys(): APIKeyConfig[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored keys:', error);
      return [];
    }
  }

  // Get all API keys for a provider
  getProviderKeys(provider: string): APIKeyConfig[] {
    return this.getStoredKeys().filter(k => k.provider === provider);
  }

  // Activate/deactivate API key
  async setActiveKey(keyId: string, active: boolean): Promise<void> {
    const keys = this.getStoredKeys();
    
    // Deactivate all keys for the same provider first
    const targetKey = keys.find(k => k.id === keyId);
    if (targetKey) {
      keys.forEach(k => {
        if (k.provider === targetKey.provider) {
          k.isActive = false;
        }
      });
      
      targetKey.isActive = active;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
      
      // Clear cache if deactivating
      if (!active) {
        this.memoryCache.delete(targetKey.provider);
      }
    }
  }

  // Delete API key
  async deleteAPIKey(keyId: string): Promise<void> {
    const keys = this.getStoredKeys();
    const keyIndex = keys.findIndex(k => k.id === keyId);
    
    if (keyIndex !== -1) {
      const key = keys[keyIndex];
      
      // Remove from cache
      this.memoryCache.delete(key.provider);
      
      // Remove from storage
      keys.splice(keyIndex, 1);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    }
  }

  // Validate API key
  async validateAPIKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      // Basic validation based on provider
      const providerConfig = this.PROVIDERS[provider];
      if (!providerConfig) {
        return false;
      }

      // Key format validation
      switch (provider) {
        case 'openai':
          return apiKey.startsWith('sk-') && apiKey.length > 20;
        case 'anthropic':
          return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
        case 'google':
          return apiKey.length > 20;
        case 'groq':
          return apiKey.startsWith('gsk_') && apiKey.length > 20;
        case 'perplexity':
          return apiKey.startsWith('pplx-') && apiKey.length > 20;
        case 'mistral':
          return apiKey.length > 20;
        case 'ollama':
          return true; // Local models don't need validation
        default:
          return apiKey.length > 10;
      }
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  // Get provider information
  getProviderInfo(provider: string): ProviderConfig | null {
    return this.PROVIDERS[provider] || null;
  }

  // Get all providers
  getAllProviders(): Record<string, ProviderConfig> {
    return this.PROVIDERS;
  }

  // Export keys for backup (encrypted)
  exportKeys(password: string): string {
    const keys = this.getStoredKeys();
    const exportData = JSON.stringify(keys);
    
    // Encrypt with user-provided password
    const encrypted = this.encryptData(exportData, password);
    return JSON.stringify(encrypted);
  }

  // Import keys from backup
  async importKeys(encryptedData: string, password: string): Promise<void> {
    try {
      const encryptedKey: EncryptedKey = JSON.parse(encryptedData);
      const decryptedData = this.decryptData(encryptedKey, password);
      const keys: APIKeyConfig[] = JSON.parse(decryptedData);
      
      // Merge with existing keys
      const existingKeys = this.getStoredKeys();
      const mergedKeys = [...existingKeys];
      
      for (const key of keys) {
        if (!existingKeys.find(k => k.id === key.id)) {
          mergedKeys.push(key);
        }
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedKeys));
    } catch (error) {
      console.error('Failed to import keys:', error);
      throw new Error('Invalid password or corrupted backup');
    }
  }

  // Clear all keys
  clearAllKeys(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.memoryCache.clear();
  }

  // Security check
  async securityCheck(): Promise<{
    hasMasterKey: boolean;
    keyCount: number;
    activeKeys: number;
    warnings: string[];
  }> {
    const keys = this.getStoredKeys();
    const warnings: string[] = [];

    if (!this.masterKey) {
      warnings.push('Master key not initialized');
    }

    if (keys.length === 0) {
      warnings.push('No API keys stored');
    }

    const activeKeys = keys.filter(k => k.isActive).length;
    if (activeKeys === 0 && keys.length > 0) {
      warnings.push('No active API keys');
    }

    // Check for old keys (older than 90 days)
    const oldKeys = keys.filter(k => 
      k.lastUsed && (Date.now() - k.lastUsed) > 90 * 24 * 60 * 60 * 1000
    );
    if (oldKeys.length > 0) {
      warnings.push(`${oldKeys.length} unused keys detected`);
    }

    return {
      hasMasterKey: !!this.masterKey,
      keyCount: keys.length,
      activeKeys,
      warnings
    };
  }
}

// Create singleton instance
const apiKeyManager = new APIKeyManager();

export default apiKeyManager;
export type { APIKeyConfig, ProviderConfig };