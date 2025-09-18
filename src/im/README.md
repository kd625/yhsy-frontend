# IM模块文档

## 概述

IM模块是砚湖书影平台的即时通讯模块，基于WebSocket实现实时消息传输，支持单聊功能。模块采用TypeScript开发，提供完整的类型定义和错误处理机制。

## 功能特性

- ✅ WebSocket连接管理
- ✅ 用户认证和权限验证
- ✅ 实时消息发送和接收
- ✅ 会话管理
- ✅ 心跳检测
- ✅ 断线重连
- ✅ 消息队列和重试机制
- ✅ 错误处理和日志记录
- ✅ 事件系统和回调机制
- ✅ 数据验证和安全检查

## 架构设计

```
src/im/
├── client/                 # 客户端核心
│   ├── IMClient.ts        # IM客户端主类
│   ├── SimpleConnectionManager.ts  # 连接管理器
│   └── SessionManager.ts  # 会话管理器
├── utils/                 # 工具类
│   ├── EventEmitter.ts    # 事件发射器
│   ├── ErrorHandler.ts    # 错误处理器
│   ├── Logger.ts          # 日志记录器
│   ├── Validator.ts       # 数据验证器
│   ├── MessageQueue.ts    # 消息队列
│   ├── HeartbeatManager.ts # 心跳管理器
│   └── ReconnectManager.ts # 重连管理器
├── types/                 # 类型定义
│   └── index.ts          # 所有类型定义
├── components/            # Vue组件
│   ├── ChatWindow.vue    # 聊天窗口
│   └── SessionList.vue   # 会话列表
└── views/                # 页面组件
    └── ChatPage.vue      # 聊天页面
```

## 快速开始

### 1. 安装和配置

```typescript
import { IMClient } from '@/im/client/IMClient'
import type { IMClientConfig } from '@/im/types'

// 配置IM客户端
const config: IMClientConfig = {
  wsUrl: 'ws://localhost:8080/ws',
  token: 'your-auth-token',
  userId: 123,
  reconnect: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000
  },
  heartbeat: {
    interval: 30000,
    timeout: 5000
  }
}

// 创建IM客户端实例
const imClient = new IMClient(config)
```

### 2. 设置事件回调

```typescript
imClient.setCallbacks({
  connected: () => {
    console.log('连接成功')
  },
  disconnected: () => {
    console.log('连接断开')
  },
  authenticated: () => {
    console.log('认证成功')
  },
  messageReceived: (message) => {
    console.log('收到消息:', message)
  },
  error: (error) => {
    console.error('连接错误:', error)
  }
})
```

### 3. 连接和发送消息

```typescript
// 连接到服务器
await imClient.connect()

// 发送消息
await imClient.sendMessage({
  toUserId: 456,
  content: 'Hello, World!',
  messageType: 'text'
})

// 断开连接
await imClient.disconnect()
```

## API参考

### IMClient

主要的IM客户端类，提供完整的即时通讯功能。

#### 构造函数

```typescript
constructor(config: IMClientConfig)
```

#### 主要方法

##### connect()
```typescript
async connect(): Promise<void>
```
连接到WebSocket服务器并进行认证。

##### disconnect()
```typescript
async disconnect(): Promise<void>
```
断开WebSocket连接。

##### sendMessage()
```typescript
async sendMessage(request: ChatSendToOneRequest): Promise<void>
```
发送单聊消息。

参数：
- `request.toUserId`: 接收者用户ID
- `request.content`: 消息内容
- `request.messageType`: 消息类型（可选，默认为'text'）

##### setCallbacks()
```typescript
setCallbacks(callbacks: Partial<IMEventCallbacks>): void
```
设置事件回调函数。

##### getConnectionState()
```typescript
getConnectionState(): ConnectionState
```
获取当前连接状态。

##### updateAccessToken()
```typescript
updateAccessToken(token: string): void
```
更新访问令牌。

#### 会话管理方法

##### getSession()
```typescript
async getSession(params: SessionGetRequest): Promise<SessionVO | null>
```
获取会话信息。

##### addSession()
```typescript
async addSession(params: SessionCreateRequest): Promise<SessionVO>
```
创建新会话。

##### getOrCreateSession()
```typescript
async getOrCreateSession(bookId: number, buyerId: number, sellerId: number): Promise<SessionVO>
```
获取或创建会话。

##### getCachedSession()
```typescript
getCachedSession(sessionId: number): SessionVO | undefined
```
获取缓存的会话。

##### getAllCachedSessions()
```typescript
getAllCachedSessions(): SessionVO[]
```
获取所有缓存的会话。

### 类型定义

#### IMClientConfig
```typescript
interface IMClientConfig {
  wsUrl: string           // WebSocket服务器地址
  token: string          // 认证令牌
  userId: number         // 用户ID
  reconnect?: {          // 重连配置
    maxRetries: number
    initialDelay: number
    maxDelay: number
  }
  heartbeat?: {          // 心跳配置
    interval: number
    timeout: number
  }
}
```

#### ChatSendToOneRequest
```typescript
interface ChatSendToOneRequest {
  toUserId: number       // 接收者用户ID
  content: string        // 消息内容
  messageType?: string   // 消息类型
}
```

#### ChatReceivedMessage
```typescript
interface ChatReceivedMessage {
  content: string        // 消息内容
  fromUser?: number      // 发送者用户ID
  msgId?: number         // 消息ID
  timestamp?: number     // 时间戳
}
```

#### SessionVO
```typescript
interface SessionVO {
  id: number            // 会话ID
  bookId: number        // 图书ID
  buyerId: number       // 买家ID
  sellerId: number      // 卖家ID
  sessionStatus: number // 会话状态 (1-活跃, 2-已过期, 3-已关闭)
  expireTime: string    // 过期时间
}
```

#### IMEventCallbacks
```typescript
interface IMEventCallbacks {
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
```

## 高级功能

### 心跳检测

IM模块内置心跳检测机制，自动检测连接状态：

```typescript
const config: IMClientConfig = {
  // ...其他配置
  heartbeat: {
    interval: 30000,  // 心跳间隔30秒
    timeout: 5000     // 心跳超时5秒
  }
}
```

### 断线重连

支持多种重连策略：

```typescript
const config: IMClientConfig = {
  // ...其他配置
  reconnect: {
    maxRetries: 5,      // 最大重连次数
    initialDelay: 1000, // 初始延迟1秒
    maxDelay: 30000     // 最大延迟30秒
  }
}
```

重连策略类型：
- `fixed`: 固定延迟
- `linear`: 线性递增延迟
- `exponential`: 指数退避延迟（默认）

### 消息队列

内置消息队列机制，确保消息可靠传输：

- 自动重试失败的消息
- 支持消息优先级
- 连接恢复后自动发送队列中的消息

### 错误处理

完善的错误处理机制：

```typescript
imClient.setCallbacks({
  error: (error) => {
    switch (error.code) {
      case 'CONNECTION_FAILED':
        // 处理连接失败
        break
      case 'AUTH_FAILED':
        // 处理认证失败
        break
      case 'MESSAGE_SEND_FAILED':
        // 处理消息发送失败
        break
    }
  }
})
```

## Vue组件使用

### ChatPage组件

完整的聊天页面组件：

```vue
<template>
  <ChatPage />
</template>

<script setup lang="ts">
import ChatPage from '@/views/Chat/ChatPage.vue'
</script>
```

### ChatWindow组件

聊天窗口组件：

```vue
<template>
  <ChatWindow 
    :session="currentSession"
    @send-message="handleSendMessage"
  />
</template>

<script setup lang="ts">
import ChatWindow from '@/components/Chat/ChatWindow.vue'
import type { SessionVO } from '@/im/types'

const currentSession = ref<SessionVO | null>(null)

const handleSendMessage = (content: string) => {
  // 处理发送消息
}
</script>
```

### SessionList组件

会话列表组件：

```vue
<template>
  <SessionList 
    :sessions="sessions"
    @session-select="handleSessionSelect"
  />
</template>

<script setup lang="ts">
import SessionList from '@/components/Chat/SessionList.vue'
import type { SessionVO } from '@/im/types'

const sessions = ref<SessionVO[]>([])

const handleSessionSelect = (session: SessionVO) => {
  // 处理会话选择
}
</script>
```

## 最佳实践

### 1. 连接管理

```typescript
// 在应用启动时初始化IM客户端
const imClient = new IMClient(config)

// 在用户登录后连接
await imClient.connect()

// 在用户登出或应用关闭时断开连接
await imClient.disconnect()
```

### 2. 错误处理

```typescript
// 设置全局错误处理
imClient.setCallbacks({
  error: (error) => {
    // 记录错误日志
    console.error('IM错误:', error)
    
    // 显示用户友好的错误信息
    ElMessage.error('连接异常，请检查网络')
  }
})
```

### 3. 消息处理

```typescript
// 处理接收到的消息
imClient.setCallbacks({
  messageReceived: (message) => {
    // 更新UI显示新消息
    addMessageToChat(message)
    
    // 播放提示音
    playNotificationSound()
    
    // 更新未读消息计数
    updateUnreadCount()
  }
})
```

### 4. 会话管理

```typescript
// 获取或创建会话
const session = await imClient.getOrCreateSession(bookId, buyerId, sellerId)

// 缓存会话信息
const cachedSession = imClient.getCachedSession(sessionId)
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查WebSocket服务器地址是否正确
   - 确认网络连接正常
   - 验证认证令牌是否有效

2. **消息发送失败**
   - 检查连接状态
   - 验证消息格式是否正确
   - 确认接收者用户ID是否存在

3. **认证失败**
   - 检查令牌是否过期
   - 验证用户ID是否正确
   - 确认服务器认证接口正常

### 调试技巧

1. **启用详细日志**
```typescript
// 在开发环境启用调试日志
if (process.env.NODE_ENV === 'development') {
  // 日志级别会自动设置为debug
}
```

2. **监控连接状态**
```typescript
// 定期检查连接状态
setInterval(() => {
  const state = imClient.getConnectionState()
  console.log('连接状态:', state)
}, 5000)
```

3. **测试消息发送**
```typescript
// 发送测试消息
await imClient.sendMessage({
  toUserId: 123,
  content: 'test message',
  messageType: 'text'
})
```

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 实现基础的WebSocket连接管理
- 支持单聊消息发送和接收
- 实现用户认证和会话管理

### v1.1.0 (2024-01-16)
- 添加心跳检测机制
- 实现断线重连功能
- 优化消息队列和重试机制
- 完善错误处理和日志记录

## 许可证

MIT License