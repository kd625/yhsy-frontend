import { request } from '../../utils/request'
import { logger } from '../utils/Logger'
import { IMErrorHandler, IMErrorCode } from '../utils/ErrorHandler'
import type { SessionVO, SessionCreateRequest, SessionGetRequest } from '../types'

/**
 * 会话管理器
 */
export class SessionManager {
  private sessions: Map<string, SessionVO> = new Map()  // 修改为string类型的key

  /**
   * 获取会话信息
   */
  async getSession(params: SessionGetRequest): Promise<SessionVO | null> {
    try {
      logger.debug('获取会话信息:', params)
      
      const response = await request.get('/session/get', { params })
      
      if (response.code === 0 && response.data) {
        const session = response.data as SessionVO
        this.sessions.set(session.id, session)
        return session
      }
      
      // 如果是会话不存在的错误（40400），返回null而不抛出异常
      if (response.code === 40400) {
        logger.debug('会话不存在:', params)
        return null
      }
      
      // 其他错误情况，抛出异常
      throw new Error(response.message || '获取会话失败')
      
    } catch (error: any) {
      // 如果是网络错误或其他异常，检查是否包含40400错误码
      if (error.response?.data?.code === 40400) {
        logger.debug('会话不存在:', params)
        return null
      }
      
      logger.error('获取会话失败:', error)
      throw IMErrorHandler.createError(IMErrorCode.NETWORK_ERROR)
    }
  }

  /**
   * 创建新会话
   */
  async addSession(params: SessionCreateRequest): Promise<SessionVO> {
    try {
      logger.debug('创建会话:', params)
      
      const response = await request.post('/session/add', params)
      
      if (response.code === 0 && response.data) {
        const session = response.data as SessionVO
        this.sessions.set(session.id, session)
        return session
      }
      
      // 创建会话失败，抛出包含具体错误信息的异常
      throw new Error(response.message || '创建会话失败')
    } catch (error: any) {
      logger.error('创建会话失败:', error)
      
      // 如果是已经包装过的错误，直接抛出
      if (error.message && !error.response) {
        throw error
      }
      
      // 如果是网络请求错误，提取错误信息
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      
      throw new Error('网络错误，请稍后重试')
    }
  }

  /**
   * 获取或创建会话
   * 使用新的startChat接口
   */
  async getOrCreateSession(bookId: number, buyerId: number, sellerId: number): Promise<SessionVO> {
    try {
      logger.debug('开始会话:', { bookId, buyerId, sellerId })
      
      // 使用POST请求，参数在Body中
      const response = await request.post('/im/session/startChat', {
        bookId,
        buyerId,
        sellerId
      })
      
      // request.post 已经返回了 BaseResponse<T> 类型的数据
      if (response.code === 0 && response.data) {
        const session = response.data as SessionVO
        this.sessions.set(session.id, session)
        logger.debug('会话创建成功:', session)
        return session
      }
      
      throw new Error(response.message || '开始会话失败')
    } catch (error: any) {
      logger.error('开始会话失败:', error)
      
      // 如果是网络请求错误，提取错误信息
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      
      throw new Error('网络错误，请稍后重试')
    }
  }

  /**
   * 获取本地缓存的会话
   */
  getCachedSession(sessionId: string): SessionVO | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 获取所有缓存的会话
   */
  getAllCachedSessions(): SessionVO[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 清除会话缓存
   */
  clearCache(): void {
    this.sessions.clear()
  }

  /**
   * 移除指定会话缓存
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * 更新会话状态
   */
  updateSession(session: SessionVO): void {
    this.sessions.set(session.id, session)
  }
}