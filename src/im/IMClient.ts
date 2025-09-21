import mitt from 'mitt';
import type { Emitter } from 'mitt';

// 消息类型常量
export const MessageTypes = {
  // 认证相关
  AUTH_REQUEST: 'AUTH_REQUEST',
  AUTH_RESPONSE: 'AUTH_RESPONSE',
  
  // 心跳相关
  HEARTBEAT_REQUEST: 'HEARTBEAT_REQUEST',
  HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE',
  
  // 聊天相关
  CHAT_SEND_TO_ONE_REQUEST: 'CHAT_SEND_TO_ONE_REQUEST',
  CHAT_SEND_RESPONSE: 'CHAT_SEND_RESPONSE',
  CHAT_REDIRECT_TO_USER_REQUEST: 'CHAT_REDIRECT_TO_USER_REQUEST',
  CHAT_ERROR_RESPONSE: 'CHAT_ERROR_RESPONSE',
};

// 连接状态枚举
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
} as const;

export type ConnectionStateType = typeof ConnectionState[keyof typeof ConnectionState];

// 认证状态枚举
export const AuthState = {
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  AUTH_FAILED: 'auth_failed',
} as const;

export type AuthStateType = typeof AuthState[keyof typeof AuthState];

// IMClient配置选项接口
export interface IMClientOptions {
  url?: string;
  accessToken: string;
  heartbeatInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

// WebSocket消息格式接口
export interface WebSocketMessage {
  type: string;
  message: string;
}

// 认证响应接口
export interface AuthResponse {
  code: number;
  message: string;
}

// 单聊消息接口
export interface ChatMessage {
  msgId: number;
  toUser: string;
  sessionId: string;
  content: string;
}

// 接收到的聊天消息接口 (CHAT_REDIRECT_TO_USER_REQUEST)
export interface IncomingChatMessage {
  msgId: number;
  fromUser: string;
  sessionId: string;
  content: string;
}

// 消息发送响应接口
export interface ChatSendResponse {
  msgId: number;
  code: number;
  message: string;
}

// 事件类型定义
export type IMClientEvents = Record<string, any> & {
  // 连接事件
  connected: void;
  disconnected: void;
  reconnecting: { attempt: number };
  reconnected: void;
  
  // 认证事件
  authenticated: void;
  authFailed: { error: string };
  
  // 消息事件
  messageReceived: IncomingChatMessage;
  messageSent: { msgId: number };
  messageFailed: { msgId: number; error: string };
  
  // 心跳事件
  heartbeatSent: void;
  heartbeatReceived: void;
  
  // 错误事件
  error: { type: string; message: string };
};

/**
 * IM客户端核心类
 * 提供WebSocket连接管理、消息发送接收、心跳检测、断线重连等功能
 */
export class IMClient {
  private ws: WebSocket | null = null;
  private eventEmitter: Emitter<IMClientEvents>;
  
  // 配置选项
  private url: string;
  private accessToken: string;
  private heartbeatInterval: number;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  
  // 状态管理
  private connectionState: ConnectionStateType = ConnectionState.DISCONNECTED;
  private authState: AuthStateType = AuthState.UNAUTHENTICATED;
  
  // 定时器管理
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  
  // 重连管理
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;
  
  constructor(options: IMClientOptions) {
    this.url = options.url || 'ws://localhost:8888/websocket';
    this.accessToken = options.accessToken;
    this.heartbeatInterval = options.heartbeatInterval || 30000; // 30秒
    this.reconnectDelay = options.reconnectDelay || 1000; // 1秒
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    
    // 初始化事件发射器
    this.eventEmitter = mitt<IMClientEvents>();
  }
  
  /**
   * 建立WebSocket连接
   */
  public async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED || 
        this.connectionState === ConnectionState.CONNECTING) {
      return;
    }
    
    this.connectionState = ConnectionState.CONNECTING;
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupWebSocketEventHandlers();
      
      // 等待连接建立
      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (event: Event) => {
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          reject(new Error('WebSocket连接失败'));
        };
        
        this.ws?.addEventListener('open', onOpen);
        this.ws?.addEventListener('error', onError);
      });
      
    } catch (error) {
      this.connectionState = ConnectionState.DISCONNECTED;
      throw error;
    }
  }
  
  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    
    // 停止心跳
    this.clearHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.clearTimers();
  }
  
  /**
   * 发送认证请求
   */
  public async authenticate(): Promise<void> {
    if (this.authState === AuthState.AUTHENTICATED) {
      return;
    }
    
    if (this.connectionState !== ConnectionState.CONNECTED) {
      throw new Error('WebSocket未连接');
    }
    
    this.authState = AuthState.AUTHENTICATING;
    
    const authMessage = {
      accessToken: this.accessToken
    };
    
    this._send({
      type: MessageTypes.AUTH_REQUEST,
      message: JSON.stringify(authMessage)
    });
  }
  
  /**
   * 发送私聊消息
   * @param toUser 目标用户ID
   * @param sessionId 会话ID
   * @param content 消息内容
   * @returns 消息ID
   */
  public async sendPrivateMessage(toUser: string, sessionId: string, content: string): Promise<number> {
    if (this.authState !== AuthState.AUTHENTICATED) {
      throw new Error('用户未认证');
    }
    
    const msgId = Date.now(); // 使用时间戳作为消息ID
    
    // 添加调试日志
    console.log('发送消息参数:', { toUser, sessionId, content });
    console.log('sessionId类型:', typeof sessionId, 'sessionId值:', sessionId);
    
    const chatMessage: ChatMessage = {
      msgId,
      toUser,
      sessionId,
      content
    };
    
    console.log('构建的ChatMessage:', chatMessage);
    console.log('ChatMessage JSON:', JSON.stringify(chatMessage));
    
    const payload = {
      type: MessageTypes.CHAT_SEND_TO_ONE_REQUEST,
      message: JSON.stringify(chatMessage)
    };
    
    console.log('发送的WebSocket消息:', payload);
    
    this._send(payload);
    
    return msgId;
  }
  
  /**
   * 发送心跳包
   */
  private sendHeartbeat(): void {
    if (this.connectionState === ConnectionState.CONNECTED) {
      this._send({
        type: MessageTypes.HEARTBEAT_REQUEST,
        message: '{}'
      });
      this.eventEmitter.emit('heartbeatSent');
    }
  }
  
  /**
   * 私有方法：发送WebSocket消息
   */
  private _send(payload: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      throw new Error('WebSocket连接不可用');
    }
  }
  
  /**
   * 设置WebSocket事件处理器
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit('connected');
      
      // 连接成功后立即进行认证
      this.authenticate().catch(error => {
        console.error('自动认证失败:', error);
      });
    };
    
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    this.ws.onclose = () => {
      this.connectionState = ConnectionState.DISCONNECTED;
      this.authState = AuthState.UNAUTHENTICATED;
      this.clearTimers();
      
      // 停止心跳
      this.clearHeartbeat();
      
      if (this.shouldReconnect) {
        this.attemptReconnect();
      } else {
        this.eventEmitter.emit('disconnected');
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      this.eventEmitter.emit('error', {
        type: 'websocket_error',
        message: 'WebSocket连接错误'
      });
    };
  }
  
  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log('收到消息:', message);
      
      switch (message.type) {
        case MessageTypes.AUTH_RESPONSE:
          this.handleAuthResponse(message.message);
          break;
          
        case MessageTypes.HEARTBEAT_RESPONSE:
          this.eventEmitter.emit('heartbeatReceived');
          break;
          
        case MessageTypes.CHAT_SEND_RESPONSE:
          this.handleChatSendResponse(message.message);
          break;
          
        case MessageTypes.CHAT_REDIRECT_TO_USER_REQUEST:
          this.handleIncomingMessage(message.message);
          break;
          
        case MessageTypes.CHAT_ERROR_RESPONSE:
          this.handleChatErrorResponse(message.message);
          break;
          
        default:
          console.warn('未知消息类型:', message.type);
          console.log('可用的消息类型:', Object.values(MessageTypes));
      }
    } catch (error) {
      console.error('消息解析失败:', error);
    }
  }
  
  /**
   * 处理认证响应
   */
  private handleAuthResponse(messageData: string): void {
    try {
      const authResponse: AuthResponse = JSON.parse(messageData);
      
      if (authResponse.code === 0) {
        this.authState = AuthState.AUTHENTICATED;
        this.eventEmitter.emit('authenticated');
        
        // 认证成功后启动心跳
        this.startHeartbeat();
      } else {
        this.authState = AuthState.AUTH_FAILED;
        this.eventEmitter.emit('authFailed', {
          error: authResponse.message || '认证失败'
        });
      }
    } catch (error) {
      console.error('认证响应解析失败:', error);
      this.authState = AuthState.AUTH_FAILED;
      this.eventEmitter.emit('authFailed', {
        error: '认证响应格式错误'
      });
    }
  }
  
  /**
   * 处理消息发送响应
   */
  private handleChatSendResponse(messageData: string): void {
    try {
      const response: ChatSendResponse = JSON.parse(messageData);
      
      if (response.code === 0) {
        this.eventEmitter.emit('messageSent', { msgId: response.msgId });
      } else {
        this.eventEmitter.emit('messageFailed', {
          msgId: response.msgId,
          error: response.message || '消息发送失败'
        });
      }
    } catch (error) {
      console.error('消息发送响应解析失败:', error);
    }
  }
  
  /**
   * 处理接收到的消息
   */
  private handleIncomingMessage(messageData: string): void {
    try {
      // 使用自定义解析器处理大数精度问题
      const incomingMessage: IncomingChatMessage = this.parseMessageWithBigInt(messageData);
      console.log('接收到消息:', incomingMessage);
      this.eventEmitter.emit('messageReceived', incomingMessage);
    } catch (error) {
      console.error('接收消息解析失败:', error);
    }
  }

  /**
   * 自定义消息解析器，处理大数精度问题
   */
  private parseMessageWithBigInt(messageData: string): IncomingChatMessage {
    // 先用正则表达式替换大数字段为字符串格式
    const processedData = messageData.replace(
      /"(sessionId|msgId)":(\d+)/g,
      (match, key, value) => {
        // 如果数字超过JavaScript安全整数范围，保持为字符串
        if (value.length > 15 || parseInt(value) > Number.MAX_SAFE_INTEGER) {
          return `"${key}":"${value}"`;
        }
        return match;
      }
    );
    
    const parsed = JSON.parse(processedData);
    
    // 确保返回正确的类型
    return {
      msgId: typeof parsed.msgId === 'string' ? parseInt(parsed.msgId) : parsed.msgId,
      fromUser: parsed.fromUser,
      sessionId: parsed.sessionId, // 保持为字符串
      content: parsed.content
    };
  }
  
  /**
   * 处理消息发送错误响应
   */
  private handleChatErrorResponse(messageData: string): void {
    try {
      const errorResponse = JSON.parse(messageData);
      console.error('收到消息发送错误响应:', errorResponse);
      
      this.eventEmitter.emit('messageFailed', {
        msgId: errorResponse.msgId || 0,
        error: errorResponse.errorMsg || '系统内部异常'
      });
    } catch (error) {
      console.error('消息错误响应解析失败:', error);
    }
  }
  
  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }
  
  /**
   * 清除心跳定时器
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.eventEmitter.emit('error', {
        type: 'max_reconnect_attempts',
        message: '重连次数超过限制'
      });
      return;
    }
    
    this.reconnectAttempts++;
    this.connectionState = ConnectionState.RECONNECTING;
    this.eventEmitter.emit('reconnecting', { attempt: this.reconnectAttempts });
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.eventEmitter.emit('reconnected');
      } catch (error) {
        console.error(`第${this.reconnectAttempts}次重连失败:`, error);
        this.attemptReconnect();
      }
    }, delay);
  }
  
  /**
   * 清除所有定时器
   */
  private clearTimers(): void {
    this.clearHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  // 事件监听方法
  public on<K extends keyof IMClientEvents>(
    event: K,
    handler: (data: IMClientEvents[K]) => void
  ): void {
    this.eventEmitter.on(event, handler);
  }
  
  public off<K extends keyof IMClientEvents>(
    event: K,
    handler: (data: IMClientEvents[K]) => void
  ): void {
    this.eventEmitter.off(event, handler);
  }
  
  // 状态查询方法
  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
  
  public isAuthenticated(): boolean {
    return this.authState === AuthState.AUTHENTICATED;
  }
  
  public getConnectionState(): ConnectionStateType {
    return this.connectionState;
  }
  
  public getAuthState(): AuthStateType {
    return this.authState;
  }
  
  // 更新访问令牌
  public updateAccessToken(newToken: string): void {
    this.accessToken = newToken;
  }
}