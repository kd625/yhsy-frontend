import request from '@/utils/request'
import type { BaseResponse } from '@/types/common'

/**
 * 会话信息
 */
export interface SessionVO {
  id: string  // 修改为string类型，与后端返回数据一致
  bookId: number
  buyerId: number
  sellerId: number
  sessionStatus: number // 1-活跃, 2-已过期, 3-已关闭
  expireTime: string
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

/**
 * 开始会话请求参数
 */
export interface StartChatRequest {
  bookId?: number
  buyerId?: number
  sellerId?: number
}

/**
 * 开始会话
 */
export const startChat = (params: StartChatRequest): Promise<BaseResponse<SessionVO>> => {
  return request.post('/im/session/startChat', params)
}

/**
 * 创建会话
 */
export const createSession = (data: SessionCreateRequest): Promise<BaseResponse<SessionVO>> => {
  return request.post('/im/session/create', data)
}

/**
 * 获取会话
 */
export const getSession = (params: SessionGetRequest): Promise<BaseResponse<SessionVO>> => {
  return request.get('/im/session/get', { params })
}

/**
 * 根据买家ID、卖家ID和图书ID开始会话
 */
export const getOrCreateSession = async (bookId: number, buyerId: number, sellerId: number): Promise<SessionVO> => {
  try {
    console.log('开始会话请求参数:', { bookId, buyerId, sellerId })
    
    // 使用新的startChat接口
    const response = await startChat({ bookId, buyerId, sellerId })
    console.log('startChat完整响应:', response);
    console.log('响应类型:', typeof response);
    
    // 正确解析嵌套的响应结构
    const businessResponse = response.data as any; // 这里是真正的业务响应 {code, data, message}
    console.log('业务响应:', businessResponse);
    console.log('业务响应code:', businessResponse?.code);
    console.log('业务响应data:', businessResponse?.data);
    console.log('业务响应message:', businessResponse?.message);

    // 检查响应是否成功
    if (response && businessResponse) {
      // 检查业务逻辑是否成功
      if (businessResponse.code === 0) {
        console.log('会话创建成功:', businessResponse.data);
        return businessResponse.data;
      } else {
        console.error('业务错误详情:', {
          hasResponse: !!response,
          businessCode: businessResponse.code,
          hasBusinessData: !!businessResponse.data,
          businessMessage: businessResponse.message
        });
        throw new Error(businessResponse.message || '开始会话失败');
      }
    } else {
      throw new Error('响应数据格式错误');
    }
    
  } catch (error: any) {
    console.error('开始会话异常详情:', {
      error,
      errorType: typeof error,
      errorMessage: error?.message,
      errorResponse: error?.response,
      errorStack: error?.stack
    })
    
    // 处理不同类型的错误
    if (error.response) {
      // HTTP错误响应
      const status = error.response.status
      const data = error.response.data
      console.error('HTTP错误详情:', { status, data })
      
      if (status === 401) {
        throw new Error('登录已过期，请重新登录')
      } else if (status === 403) {
        throw new Error('权限不足')
      } else if (status === 404) {
        throw new Error('接口不存在')
      } else if (status === 500) {
        throw new Error('服务器内部错误')
      } else {
        throw new Error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      throw new Error('请求超时，请检查网络连接')
    } else if (error.message && !error.message.includes('开始会话失败')) {
      // 其他已知错误，但不是我们自己抛出的错误
      throw error
    } else {
      // 重新抛出我们自己的业务错误或未知错误
      throw error
    }
  }
}