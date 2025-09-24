import { useIMStore } from '@/store/im'

/**
 * 初始化IM连接
 * 在用户登录成功后调用，建立WebSocket连接并进行身份验证
 * @param accessToken 用户访问令牌
 */
export const initIMConnection = async (accessToken: string): Promise<void> => {
  try {
    const imStore = useIMStore()
    
    // 初始化IM客户端
    imStore.initialize(accessToken)
    
    // 初始化事件监听
    imStore.initClient()
    
    // 连接IM服务并进行身份验证
    await imStore.connectIM()
    
    console.log('IM连接初始化成功')
  } catch (error) {
    console.error('IM连接初始化失败:', error)
    throw error
  }
}

/**
 * 断开IM连接
 * 在用户登出时调用
 */
export const disconnectIM = (): void => {
  try {
    const imStore = useIMStore()
    imStore.disconnect()
    console.log('IM连接已断开')
  } catch (error) {
    console.error('断开IM连接失败:', error)
  }
}