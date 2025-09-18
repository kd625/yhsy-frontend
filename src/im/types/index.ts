/**
 * IM模块类型定义
 */

/**
 * WebSocket消息基础结构
 */
export interface WebSocketMessage {
  type: string
  id: string
  timestamp: number
  data?: any
}

/**
 * 认证请求消息
 */
export interface AuthRequestMessage {
  accessToken: string
}

/**
 * 认证响应消息
 */
export interface AuthResponseMessage {
  code: number
  message: string
}

/**
 * 单聊消息发送请求
 */
export interface ChatSendToOneMessage {
  msgId: number
  toUser: number
  content: string
}

// 单聊消息发送请求
export interface ChatSendToOneRequest {
  toUserId: number
  content: string
  messageType?: string
}

// 认证相关类型
export interface AuthRequest {
  token: string
  userId: number
}

export interface AuthResponse {
  success: boolean
  message?: string
  userId?: number
}

// 心跳相关类型
export interface HeartbeatRequest {
  timestamp: number
}

export interface HeartbeatResponse {
  timestamp: number
  serverTime: number
}

// 连接状态
export const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING', 
  CONNECTED: 'CONNECTED',
  AUTHENTICATED: 'AUTHENTICATED',
  RECONNECTING: 'RECONNECTING'
} as const

export type ConnectionStatusType = typeof ConnectionStatus[keyof typeof ConnectionStatus]

// 连接状态接口
export interface ConnectionState {
  status: ConnectionStatusType
  lastConnectTime?: number
  lastDisconnectTime?: number
  reconnectAttempts: number
  lastError?: string
}

// IM客户端配置
export interface IMClientConfig {
  wsUrl: string
  token: string
  userId: number
  reconnect?: {
    maxRetries: number
    initialDelay: number
    maxDelay: number
  }
  heartbeat?: {
    interval: number
    timeout: number
  }
}

/**
 * 消息发送响应
 */
export interface ChatSendResponseMessage {
  msgId: number
  code: number
  message: string
}

// 单聊消息发送响应
export interface ChatSendToOneResponse {
  code: number
  message: string
  data?: any
}

// 单聊消息发送响应（简化版）
export interface ChatSendResponse {
  code: number
  message: string
  data?: any
}

/**
 * 接收到的消息
 */
export interface ChatReceivedMessage {
  msgId: number
  content: string
  fromUser: number
  fromUserId: number
  sessionId: number
  timestamp: number
  messageType: string
}

// 消息接收（简化版）
export interface ChatReceiveMessage {
  fromUserId: number
  toUserId: number
  content: string
  messageType: string
  timestamp: number
}

/**
 * 消息队列项
 */
export interface MessageQueueItem {
  id: string
  message: WebSocketMessage
  timestamp: number
  retryCount: number
}

/**
 * 事件回调函数类型
 */
export interface IMEventCallbacks {
  // 连接事件
  connected?: () => void
  disconnected?: () => void
  reconnecting?: (attempt: number) => void
  reconnected?: () => void
  
  // 认证事件
  authenticated?: () => void
  authFailed?: (error: any) => void
  
  // 消息事件
  messageReceived?: (message: ChatReceivedMessage) => void
  messageSent?: (message: ChatSendToOneMessage) => void
  messageFailed?: (error: any) => void
  
  // 心跳事件
  heartbeatSent?: () => void
  heartbeatReceived?: () => void
  
  // 错误事件
  error?: (error: any) => void
}

/**
 * 会话信息
 */
export interface SessionVO {
  id: number
  bookId: number
  buyerId: number
  sellerId: number
  sessionStatus: number // 1-活跃, 2-已过期, 3-已关闭
  expireTime: string
  createTime: string
}

/**
 * 会话创建请求
 */
export interface SessionCreateRequest {
  bookId: number
  buyerId: number
  sellerId: number
}

/**
 * 会话查询请求
 */
export interface SessionGetRequest {
  sessionId?: number
  bookId?: number
  buyerId?: number
  sellerId?: number
}

// 心跳配置
export interface HeartbeatConfig {
  interval: number;    // 心跳间隔（毫秒）
  timeout: number;     // 心跳超时时间（毫秒）
  maxMissed: number;   // 最大丢失心跳次数
}

// 心跳回调接口
export interface HeartbeatCallbacks {
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

// 重连配置
export interface ReconnectConfig {
  maxAttempts: number;    // 最大重连次数
  initialDelay: number;   // 初始延迟（毫秒）
  maxDelay: number;       // 最大延迟（毫秒）
  strategy: 'linear' | 'exponential';  // 重连策略
  backoffMultiplier: number;  // 退避乘数
  jitter: boolean;       // 是否添加随机抖动
}