/**
 * IM模块错误处理工具
 */

export const IMErrorCode = {
  // 连接相关错误
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_LOST: 'CONNECTION_LOST',
  RECONNECT_FAILED: 'RECONNECT_FAILED',
  
  // 认证相关错误
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_TIMEOUT: 'AUTH_TIMEOUT',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // 消息相关错误
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  MESSAGE_TIMEOUT: 'MESSAGE_TIMEOUT',
  MESSAGE_FORMAT_ERROR: 'MESSAGE_FORMAT_ERROR',
  
  // 会话相关错误
  SESSION_CREATE_FAILED: 'SESSION_CREATE_FAILED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  
  // 网络相关错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // 其他错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type IMErrorCodeType = typeof IMErrorCode[keyof typeof IMErrorCode]

export interface IMError {
  code: IMErrorCodeType
  message: string
  details?: any
  timestamp: number
}

export class IMErrorHandler {
  private static errorMessages: Record<IMErrorCodeType, string> = {
    [IMErrorCode.CONNECTION_FAILED]: '连接服务器失败',
    [IMErrorCode.CONNECTION_TIMEOUT]: '连接超时',
    [IMErrorCode.CONNECTION_LOST]: '连接已断开',
    [IMErrorCode.RECONNECT_FAILED]: '重连失败',
    
    [IMErrorCode.AUTH_FAILED]: '身份验证失败',
    [IMErrorCode.AUTH_TIMEOUT]: '身份验证超时',
    [IMErrorCode.TOKEN_INVALID]: '登录状态已过期',
    
    [IMErrorCode.MESSAGE_SEND_FAILED]: '消息发送失败',
    [IMErrorCode.MESSAGE_TIMEOUT]: '消息发送超时',
    [IMErrorCode.MESSAGE_FORMAT_ERROR]: '消息格式错误',
    
    [IMErrorCode.SESSION_CREATE_FAILED]: '创建会话失败',
    [IMErrorCode.SESSION_NOT_FOUND]: '会话不存在',
    
    [IMErrorCode.NETWORK_ERROR]: '网络连接异常',
    [IMErrorCode.SERVER_ERROR]: '服务器错误',
    
    [IMErrorCode.UNKNOWN_ERROR]: '未知错误'
  }

  /**
   * 创建IM错误
   */
  static createError(code: IMErrorCodeType, details?: any): IMError {
    return {
      code,
      message: this.errorMessages[code] || '未知错误',
      details,
      timestamp: Date.now()
    }
  }

  /**
   * 从WebSocket错误创建IM错误
   */
  static fromWebSocketError(event: Event): IMError {
    return this.createError(IMErrorCode.CONNECTION_FAILED, {
      type: 'websocket',
      event
    })
  }

  /**
   * 从网络错误创建IM错误
   */
  static fromNetworkError(error: Error): IMError {
    if (error.message.includes('timeout')) {
      return this.createError(IMErrorCode.CONNECTION_TIMEOUT, error)
    }
    
    if (error.message.includes('network')) {
      return this.createError(IMErrorCode.NETWORK_ERROR, error)
    }
    
    return this.createError(IMErrorCode.UNKNOWN_ERROR, error)
  }

  /**
   * 从API错误创建IM错误
   */
  static fromApiError(response: any): IMError {
    const code = response?.code
    const message = response?.message
    
    if (code === 40100 || code === 40101) {
      return this.createError(IMErrorCode.TOKEN_INVALID, response)
    }
    
    if (code >= 50000) {
      return this.createError(IMErrorCode.SERVER_ERROR, response)
    }
    
    return this.createError(IMErrorCode.UNKNOWN_ERROR, response)
  }

  /**
   * 判断是否为可重试的错误
   */
  static isRetryableError(error: IMError): boolean {
    const retryableCodes = [
      IMErrorCode.CONNECTION_FAILED,
      IMErrorCode.CONNECTION_TIMEOUT,
      IMErrorCode.CONNECTION_LOST,
      IMErrorCode.MESSAGE_TIMEOUT,
      IMErrorCode.NETWORK_ERROR,
      IMErrorCode.SERVER_ERROR
    ] as const
    
    return (retryableCodes as readonly string[]).includes(error.code)
  }

  /**
   * 判断是否为认证相关错误
   */
  static isAuthError(error: IMError): boolean {
    const authCodes = [
      IMErrorCode.AUTH_FAILED,
      IMErrorCode.AUTH_TIMEOUT,
      IMErrorCode.TOKEN_INVALID
    ] as const
    
    return (authCodes as readonly string[]).includes(error.code)
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserMessage(error: IMError): string {
    return error.message
  }

  /**
   * 记录错误日志
   */
  static logError(error: IMError, context?: string): void {
    console.error(`[IM Error${context ? ` - ${context}` : ''}]:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date(error.timestamp).toISOString()
    })
  }
}