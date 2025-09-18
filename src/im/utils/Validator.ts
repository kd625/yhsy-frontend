/**
 * IM模块数据验证工具
 */

import type { WebSocketMessage, ChatSendRequest } from '../types'

export class IMValidator {
  /**
   * 验证WebSocket消息格式
   */
  static validateWebSocketMessage(message: any): message is WebSocketMessage {
    if (!message || typeof message !== 'object') {
      return false
    }

    // 检查必需字段
    if (!message.type || typeof message.type !== 'string') {
      return false
    }

    if (!message.id || typeof message.id !== 'string') {
      return false
    }

    if (!message.timestamp || typeof message.timestamp !== 'number') {
      return false
    }

    return true
  }

  /**
   * 验证单聊消息发送请求
   */
  static validateChatSendRequest(request: any): request is ChatSendRequest {
    if (!request || typeof request !== 'object') {
      return false
    }

    // 检查必需字段
    if (!request.sessionId || typeof request.sessionId !== 'string') {
      return false
    }

    if (!request.content || typeof request.content !== 'string') {
      return false
    }

    if (request.content.trim().length === 0) {
      return false
    }

    // 检查消息长度限制
    if (request.content.length > 1000) {
      return false
    }

    return true
  }

  /**
   * 验证用户ID
   */
  static validateUserId(userId: any): userId is number {
    return typeof userId === 'number' && userId > 0
  }

  /**
   * 验证图书ID
   */
  static validateBookId(bookId: any): bookId is number {
    return typeof bookId === 'number' && bookId > 0
  }

  /**
   * 验证会话ID
   */
  static validateSessionId(sessionId: any): sessionId is string {
    return typeof sessionId === 'string' && sessionId.trim().length > 0
  }

  /**
   * 验证消息内容
   */
  static validateMessageContent(content: any): content is string {
    if (typeof content !== 'string') {
      return false
    }

    const trimmed = content.trim()
    return trimmed.length > 0 && trimmed.length <= 1000
  }

  /**
   * 验证WebSocket URL
   */
  static validateWebSocketUrl(url: any): url is string {
    if (typeof url !== 'string') {
      return false
    }

    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:'
    } catch {
      return false
    }
  }

  /**
   * 验证Token
   */
  static validateToken(token: any): token is string {
    return typeof token === 'string' && token.trim().length > 0
  }

  /**
   * 清理和验证消息内容
   */
  static sanitizeMessageContent(content: string): string {
    // 移除首尾空白
    let sanitized = content.trim()
    
    // 移除多余的换行符
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n')
    
    // 限制长度
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000)
    }
    
    return sanitized
  }

  /**
   * 验证重连配置
   */
  static validateReconnectConfig(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    // 检查最大重连次数
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
      return false
    }

    // 检查初始延迟
    if (typeof config.initialDelay !== 'number' || config.initialDelay < 0) {
      return false
    }

    // 检查最大延迟
    if (typeof config.maxDelay !== 'number' || config.maxDelay < config.initialDelay) {
      return false
    }

    return true
  }

  /**
   * 验证心跳配置
   */
  static validateHeartbeatConfig(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    // 检查心跳间隔
    if (typeof config.interval !== 'number' || config.interval < 1000) {
      return false
    }

    // 检查超时时间
    if (typeof config.timeout !== 'number' || config.timeout < 1000) {
      return false
    }

    return true
  }
}