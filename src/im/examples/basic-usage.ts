/**
 * IM模块基本使用示例
 * 
 * 本示例展示了如何使用IM模块进行即时通讯功能的开发
 */

import { IMClient } from '../client/IMClient'
import type { IMClientConfig, ChatSendToOneRequest, ChatReceivedMessage, ChatSendToOneMessage } from '../types'

// 1. 基本配置
const config: IMClientConfig = {
  wsUrl: 'ws://localhost:8080/ws',
  token: 'your-auth-token',
  userId: 123,
  
  // 可选：重连配置
  reconnect: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000
  },
  
  // 可选：心跳配置
  heartbeat: {
    interval: 30000,
    timeout: 5000
  }
}

// 2. 创建IM客户端实例
const imClient = new IMClient(config)

// 3. 设置事件回调
imClient.setCallbacks({
  // 连接成功
  connected: () => {
    console.log('IM连接已建立')
  },
  
  // 连接断开
  disconnected: () => {
    console.log('IM连接已断开')
  },
  
  // 认证成功
  authenticated: () => {
    console.log('IM认证成功')
  },
  
  // 收到消息
  messageReceived: (message: ChatReceivedMessage) => {
    console.log('收到新消息:', message)
    
    // 处理不同类型的消息
    switch (message.messageType) {
      case 'text':
        console.log('文本消息:', message.content)
        break
      case 'image':
        console.log('图片消息:', message.content)
        break
      case 'file':
        console.log('文件消息:', message.content)
        break
    }
  },
  
  // 消息发送成功
  messageSent: (message: ChatSendToOneMessage) => {
    console.log('消息发送成功:', message.msgId)
  },
  
  // 消息发送失败
  messageFailed: (error) => {
    console.error('消息发送失败:', error)
  },
  
  // 连接错误
  error: (error) => {
    console.error('IM连接错误:', error)
  },
  
  // 心跳发送
  heartbeatSent: () => {
    console.log('心跳已发送')
  },
  
  // 心跳响应
  heartbeatReceived: () => {
    console.log('收到心跳响应')
  }
})

// 4. 连接到服务器
async function connectToIM() {
  try {
    await imClient.connect()
    console.log('IM客户端连接成功')
  } catch (error) {
    console.error('IM客户端连接失败:', error)
  }
}

// 5. 发送消息
async function sendMessage() {
  try {
    const message: ChatSendToOneRequest = {
      toUserId: 456,
      content: 'Hello, this is a test message!',
      messageType: 'text'
    }
    
    await imClient.sendMessage(message)
    console.log('消息发送请求已提交')
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 6. 会话管理
async function manageSession() {
  try {
    // 获取或创建会话
    const session = await imClient.getOrCreateSession(1, 123, 456)
    console.log('会话信息:', session)
    
    // 获取缓存的会话
    const cachedSession = imClient.getCachedSession(session.id)
    console.log('缓存的会话:', cachedSession)
    
    // 获取所有会话
    const allSessions = imClient.getAllCachedSessions()
    console.log('所有会话:', allSessions)
  } catch (error) {
    console.error('会话管理失败:', error)
  }
}

// 7. 更新访问令牌
function updateToken() {
  try {
    const newToken = 'new-auth-token'
    imClient.updateAccessToken(newToken)
    console.log('访问令牌已更新')
  } catch (error) {
    console.error('更新访问令牌失败:', error)
  }
}

// 8. 获取连接状态
function checkConnectionState() {
  const state = imClient.getConnectionState()
  console.log('连接状态:', {
    status: state.status,
    lastConnectTime: state.lastConnectTime,
    reconnectAttempts: state.reconnectAttempts,
    lastError: state.lastError
  })
}

// 9. 断开连接
async function disconnect() {
  try {
    await imClient.disconnect()
    console.log('IM客户端已断开连接')
  } catch (error) {
    console.error('断开连接失败:', error)
  }
}

// 10. 清理资源
function cleanup() {
  imClient.destroy()
  console.log('IM客户端资源已清理')
}

// 使用示例
export async function basicUsageExample() {
  console.log('=== IM模块基本使用示例 ===')
  
  // 连接
  await connectToIM()
  
  // 等待连接稳定
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 会话管理
  await manageSession()
  
  // 发送消息
  await sendMessage()
  
  // 检查状态
  checkConnectionState()
  
  // 更新令牌
  updateToken()
  
  // 等待一段时间观察消息
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // 断开连接
  await disconnect()
  
  // 清理资源
  cleanup()
  
  console.log('=== 示例完成 ===')
}

// 错误处理示例
export function errorHandlingExample() {
  console.log('=== 错误处理示例 ===')
  
  const imClient = new IMClient({
    wsUrl: 'ws://invalid-url',
    token: 'invalid-token',
    userId: 0
  })
  
  imClient.setCallbacks({
    error: (error) => {
      console.error('捕获到错误:', error)
      
      // 根据错误类型进行处理
      if (error.message.includes('WebSocket')) {
        console.log('WebSocket连接错误，可能需要检查网络或服务器状态')
      } else if (error.message.includes('auth')) {
        console.log('认证错误，可能需要刷新令牌')
      }
    },
    
    disconnected: () => {
      console.log('连接断开原因')
      
      // 根据断开原因决定是否重连
      console.log('将自动重连')
    }
  })
  
  // 尝试连接（会失败）
  imClient.connect().catch(error => {
    console.error('预期的连接失败:', error)
  })
}

// 高级功能示例
export function advancedFeaturesExample() {
  console.log('=== 高级功能示例 ===')
  
  const config: IMClientConfig = {
    wsUrl: 'ws://localhost:8080/ws',
    token: 'your-auth-token',
    userId: 123,
    
    // 自定义重连策略
    reconnect: {
      maxRetries: 10,
      initialDelay: 500,
      maxDelay: 60000
    },
    
    // 自定义心跳配置
    heartbeat: {
      interval: 15000,  // 15秒发送一次心跳
      timeout: 3000     // 3秒超时
    }
  }
  
  const imClient = new IMClient(config)
  
  // 监听所有事件
  imClient.setCallbacks({
    connected: () => console.log('✅ 连接成功'),
    disconnected: () => console.log('❌ 连接断开'),
    authenticated: () => console.log('🔐 认证成功'),
    messageReceived: (msg) => console.log('📨 收到消息:', msg.content),
    messageSent: (msg) => console.log('📤 消息已发送:', msg.msgId),
    messageFailed: (err) => console.log('❌ 消息发送失败:', err),
    error: (err) => console.log('🚨 错误:', err),
    heartbeatSent: () => console.log('💓 心跳已发送'),
    heartbeatReceived: () => console.log('💗 心跳响应')
  })
  
  return imClient
}

// 导出所有示例
export {
  connectToIM,
  sendMessage,
  manageSession,
  updateToken,
  checkConnectionState,
  disconnect,
  cleanup
}