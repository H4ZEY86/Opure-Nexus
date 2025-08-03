/**
 * AI Gateway Service - Frontend Integration
 * Real-time AI features for Discord Activity
 */

import { io, Socket } from 'socket.io-client';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
  };
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  model?: string;
  processingTime?: number;
  totalTime?: number;
  error?: string;
  metrics?: Record<string, any>;
}

export interface TokenEvaluation {
  content: string;
  contentType: 'message' | 'marketplace_item' | 'game_action' | 'achievement' | 'other';
  metadata?: Record<string, any>;
}

export interface TokenResult {
  approved: boolean;
  amount: number;
  quality: {
    overall: number;
    breakdown?: Record<string, number>;
    toxicity?: number;
  };
  fraud: {
    score: number;
    recommendation: 'approve' | 'review' | 'reject';
    confidence: number;
    factors: string[];
    reasons: string[];
  };
  calculation?: Record<string, any>;
}

export interface PerformanceMetrics {
  gpu?: {
    utilization: number;
    memory: number;
    temperature: number;
  };
  system?: {
    cpu: { utilization: number };
    memory: { utilization: number };
  };
  ai?: {
    loadedModels: string[];
    queueLength: number;
    resourceUsage: any;
  };
  timestamp: string;
}

export interface SystemAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  component: string;
  timestamp: string;
}

class AIGatewayService {
  private socket: Socket | null = null;
  private gatewayUrl: string;
  private apiKey?: string;
  private jwtToken?: string;
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  // Event handlers
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  
  // Performance tracking
  private requestCount = 0;
  private errorCount = 0;
  private responseTimeTotal = 0;
  
  constructor(
    gatewayUrl: string = 'http://localhost:3002',
    apiKey?: string,
    jwtToken?: string
  ) {
    this.gatewayUrl = gatewayUrl;
    this.apiKey = apiKey;
    this.jwtToken = jwtToken;
  }
  
  /**
   * Initialize connection to AI Gateway
   */
  async initialize(): Promise<void> {
    try {
      // Setup authentication
      const auth: Record<string, string> = {};
      if (this.jwtToken) {
        auth.token = this.jwtToken;
      }
      if (this.apiKey) {
        auth.apiKey = this.apiKey;
      }
      
      // Create WebSocket connection
      this.socket = io(this.gatewayUrl, {
        auth,
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });
      
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.connectionAttempts = 0;
          console.log('Connected to AI Gateway');
          resolve();
        });
        
        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('AI Gateway connection error:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Failed to initialize AI Gateway service:', error);
      throw error;
    }
  }
  
  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('AI Gateway WebSocket connected');
      this.connectionAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('AI Gateway WebSocket disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason });
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`AI Gateway reconnected after ${attemptNumber} attempts`);
      this.emit('connection', { status: 'reconnected', attempts: attemptNumber });
    });
    
    this.socket.on('reconnect_error', (error) => {
      this.connectionAttempts++;
      console.error('AI Gateway reconnection error:', error);
      this.emit('connection', { status: 'reconnect_error', error, attempts: this.connectionAttempts });
    });
    
    // AI response events
    this.socket.on('ai:response', (data: AIResponse) => {
      this.emit('ai:response', data);
    });
    
    this.socket.on('ai:stream:chunk', (data: { content: string; progress: number }) => {
      this.emit('ai:stream:chunk', data);
    });
    
    this.socket.on('ai:stream:complete', (data: { model: string; totalTime: number }) => {
      this.emit('ai:stream:complete', data);
    });
    
    this.socket.on('ai:stream:error', (data: { error: string }) => {
      this.emit('ai:stream:error', data);
    });
    
    // Token reward events
    this.socket.on('tokens:result', (data: TokenResult) => {
      this.emit('tokens:result', data);
    });
    
    // Performance monitoring events
    this.socket.on('performance:update', (data: PerformanceMetrics) => {
      this.emit('performance:update', data);
    });
    
    this.socket.on('analytics:update', (data: any) => {
      this.emit('analytics:update', data);
    });
    
    // System alerts
    this.socket.on('system:alert', (data: SystemAlert) => {
      this.emit('system:alert', data);
    });
    
    // Error handling
    this.socket.on('error', (data: { message: string; code?: string; details?: any }) => {
      console.error('AI Gateway error:', data);
      this.emit('error', data);
    });
  }
  
  /**
   * Add event listener
   */
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  /**
   * Remove event listener
   */
  off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Generate AI response via HTTP
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/models/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...(this.jwtToken && { 'Authorization': `Bearer ${this.jwtToken}` })
        },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      const totalTime = Date.now() - startTime;
      this.updateMetrics(totalTime, true);
      
      return {
        success: true,
        content: data.content,
        model: data.model,
        processingTime: data.metrics?.processingTime,
        totalTime,
        metrics: data.metrics
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.updateMetrics(totalTime, false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime
      };
    }
  }
  
  /**
   * Generate AI response via WebSocket
   */
  async generateResponseWS(request: AIRequest): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    
    this.socket.emit('ai:generate', request);
  }
  
  /**
   * Stream AI response via WebSocket
   */
  async streamResponse(request: AIRequest): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    
    this.socket.emit('ai:stream', request);
  }
  
  /**
   * Evaluate content for token rewards
   */
  async evaluateContent(evaluation: TokenEvaluation): Promise<TokenResult> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/tokens/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...(this.jwtToken && { 'Authorization': `Bearer ${this.jwtToken}` })
        },
        body: JSON.stringify(evaluation)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data.evaluation;
      
    } catch (error) {
      console.error('Content evaluation error:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate content via WebSocket
   */
  async evaluateContentWS(evaluation: TokenEvaluation): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    
    this.socket.emit('tokens:evaluate', evaluation);
  }
  
  /**
   * Validate content before submission
   */
  async validateContent(content: string, contentType: string): Promise<any> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/tokens/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...(this.jwtToken && { 'Authorization': `Bearer ${this.jwtToken}` })
        },
        body: JSON.stringify({ content, contentType })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
      
    } catch (error) {
      console.error('Content validation error:', error);
      throw error;
    }
  }
  
  /**
   * Get system health status
   */
  async getHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/health`, {
        headers: {
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...(this.jwtToken && { 'Authorization': `Bearer ${this.jwtToken}` })
        }
      });
      
      return await response.json();
      
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
  
  /**
   * Get performance analytics
   */
  async getAnalytics(): Promise<any> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/analytics/overview`, {
        headers: {
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...(this.jwtToken && { 'Authorization': `Bearer ${this.jwtToken}` })
        }
      });
      
      return await response.json();
      
    } catch (error) {
      console.error('Analytics error:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to performance updates
   */
  subscribeToPerformance(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe to performance - WebSocket not connected');
      return;
    }
    
    this.socket.emit('performance:subscribe');
  }
  
  /**
   * Unsubscribe from performance updates
   */
  unsubscribeFromPerformance(): void {
    if (!this.socket?.connected) {
      return;
    }
    
    this.socket.emit('performance:unsubscribe');
  }
  
  /**
   * Subscribe to analytics updates
   */
  subscribeToAnalytics(filters?: { metrics?: string[]; interval?: number }): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe to analytics - WebSocket not connected');
      return;
    }
    
    this.socket.emit('analytics:subscribe', filters);
  }
  
  /**
   * Unsubscribe from analytics updates
   */
  unsubscribeFromAnalytics(): void {
    if (!this.socket?.connected) {
      return;
    }
    
    this.socket.emit('analytics:unsubscribe');
  }
  
  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    requests: number;
    errors: number;
    successRate: number;
    averageResponseTime: number;
  } {
    const successRate = this.requestCount > 0 ? 
      ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 0;
    
    const averageResponseTime = this.requestCount > 0 ?
      this.responseTimeTotal / this.requestCount : 0;
    
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      successRate,
      averageResponseTime
    };
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    this.requestCount++;
    this.responseTimeTotal += responseTime;
    
    if (!success) {
      this.errorCount++;
    }
  }
  
  /**
   * Disconnect from AI Gateway
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.eventHandlers.clear();
    console.log('Disconnected from AI Gateway');
  }
}

// Global service instance
let aiGatewayService: AIGatewayService | null = null;

/**
 * Get or create AI Gateway service instance
 */
export function getAIGatewayService(
  gatewayUrl?: string,
  apiKey?: string,
  jwtToken?: string
): AIGatewayService {
  if (!aiGatewayService) {
    aiGatewayService = new AIGatewayService(gatewayUrl, apiKey, jwtToken);
  }
  return aiGatewayService;
}

/**
 * Initialize AI Gateway service
 */
export async function initializeAIGateway(
  gatewayUrl?: string,
  apiKey?: string,
  jwtToken?: string
): Promise<AIGatewayService> {
  const service = getAIGatewayService(gatewayUrl, apiKey, jwtToken);
  await service.initialize();
  return service;
}

export default AIGatewayService;