/**
 * WebSocket消息类型常量
 */
export const MessageTypes = {
  // 认证相关
  AUTH_REQUEST: 'AUTH_REQUEST',
  AUTH_RESPONSE: 'AUTH_RESPONSE',
  
  // 心跳相关
  HEARTBEAT_REQUEST: 'HEARTBEAT_REQUEST',
  HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE',
  
  // 单聊相关
  CHAT_SEND_TO_ONE_REQUEST: 'CHAT_SEND_TO_ONE_REQUEST',
  CHAT_SEND_REQUEST: 'CHAT_SEND_REQUEST', // 简化版
  CHAT_SEND_RESPONSE: 'CHAT_SEND_RESPONSE',
  CHAT_REDIRECT_TO_USER_REQUEST: 'CHAT_REDIRECT_TO_USER_REQUEST'
} as const

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]

/**
 * 连接错误类型
 */
export const ConnectionError = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  HEARTBEAT_TIMEOUT: 'HEARTBEAT_TIMEOUT'
} as const

export type ConnectionErrorType = typeof ConnectionError[keyof typeof ConnectionError]

/**
 * 连接状态
 */
export const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  AUTHENTICATED: 'AUTHENTICATED',
  RECONNECTING: 'RECONNECTING'
} as const

export type ConnectionStatusType = typeof ConnectionStatus[keyof typeof ConnectionStatus]