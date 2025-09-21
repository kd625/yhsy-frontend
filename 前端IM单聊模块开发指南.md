# 前端IM单聊模块开发指南

## 项目背景

基于现有的砚湖书影后端系统，需要开发一个完整的前端IM单聊模块。后端已提供基于Netty的WebSocket聊天服务，支持用户认证、心跳检测、单聊和群聊功能。要求当用户预订图书后，在预订图书旁边有一个聊一聊按钮，点击就可创建会话并且进入聊天.

## 后端服务信息

### 连接配置
- **WebSocket服务器地址**: `ws://localhost:8888/websocket`
- **Netty服务端口**: 8888
- **心跳超时时间**: 180秒（3分钟）
- **认证方式**: Sa-Token AccessToken

### 消息协议格式
所有WebSocket消息均采用JSON格式，统一结构如下：
```json
{
  "type": "消息类型",
  "message": "消息内容的JSON字符串"
}
```

### 支持的消息类型

#### 1. 用户认证 (AUTH_REQUEST)
**发送格式**:
```json
{
  "type": "AUTH_REQUEST",
  "message": "{\"accessToken\": \"用户的访问令牌\"}"
}
```

**响应格式** (AUTH_RESPONSE):
```json
{
  "type": "AUTH_RESPONSE", 
  "message": "{\"code\": 0, \"message\": \"认证成功\"}"
}
```

#### 2. 心跳检测 (HEARTBEAT_REQUEST)
**发送格式**:
```json
{
  "type": "HEARTBEAT_REQUEST",
  "message": "{}"
}
```

**响应格式** (HEARTBEAT_RESPONSE):
```json
{
  "type": "HEARTBEAT_RESPONSE",
  "message": "{}"
}
```

#### 3. 单聊消息 (CHAT_SEND_TO_ONE_REQUEST)
**发送格式**:
```json
{
  "type": "CHAT_SEND_TO_ONE_REQUEST",
  "message": "{\"msgId\": 1234567890, \"toUser\": \"123\", \"sessionId\": \"123\", \"content\": \"消息内容\"}"
}
```

**响应格式** (CHAT_SEND_RESPONSE):
```json
{
  "type": "CHAT_SEND_RESPONSE",
  "message": "{\"msgId\": 1234567890, \"sessionId\": \"123\", \"message\": \"发送成功\"}"
}
```

#### 4. 接收消息 (CHAT_REDIRECT_TO_USER_REQUEST)
**接收格式**:
```json
{
  "type": "CHAT_REDIRECT_TO_USER_REQUEST",
  "message": "{\"content\": \"收到的消息内容\"}"
}
```

## 功能需求

### 核心功能
1. **WebSocket连接管理**
   - 建立和维护WebSocket连接
   - 连接状态监控和显示
   - 连接异常处理

2. **用户认证**
   - 使用AccessToken进行用户认证
   - 认证状态管理
   - 认证失败处理

3. **心跳检测**
   - 自动发送心跳包（建议间隔30-60秒）
   - 心跳响应监控
   - 心跳超时处理

4. **单聊功能**
   - 发送单聊消息
   - 接收单聊消息
   - 消息状态反馈
   - 消息历史记录

5. **断线重连**
   - 自动检测连接断开
   - 指数退避重连策略
   - 重连状态提示
   - 重连后状态恢复


6. **创建会话**
   - 用户预订图书后，点击图书详情页的聊一聊按钮，创建会话并进入聊天界面.
   - 先调用后端getSession接口，如果返回会话不存在则调用addSession接口创建会话，然后进入聊天界面.

### 技术要求

#### 1. 架构设计
- 采用模块化设计，便于维护和扩展
- 使用事件驱动架构处理WebSocket消息
- 实现状态管理，维护连接、认证、消息等状态
- 支持插件化扩展，便于后续功能添加

#### 2. 连接管理
```javascript
class IMClient {
  constructor(options) {
    this.url = options.url || 'ws://localhost:8888/websocket';
    this.accessToken = options.accessToken;
    this.heartbeatInterval = options.heartbeatInterval || 30000; // 30秒
    this.reconnectDelay = options.reconnectDelay || 1000; // 1秒
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }
  
  connect() { /* 连接逻辑 */ }
  disconnect() { /* 断开连接 */ }
  send(message) { /* 发送消息 */ }
  authenticate() { /* 用户认证 */ }
}
```

#### 3. 事件系统
实现完整的事件监听机制：
```javascript
// 连接事件
client.on('connected', () => {});
client.on('disconnected', () => {});
client.on('reconnecting', (attempt) => {});

// 认证事件  
client.on('authenticated', () => {});
client.on('authFailed', (error) => {});

// 消息事件
client.on('messageReceived', (message) => {});
client.on('messageSent', (message) => {});
client.on('messageFailed', (error) => {});

// 心跳事件
client.on('heartbeatSent', () => {});
client.on('heartbeatReceived', () => {});
```

### API设计示例

#### 1. 初始化客户端
```javascript
const imClient = new IMClient({
  url: 'ws://localhost:8888/websocket',
  accessToken: 'your-access-token',
  heartbeatInterval: 30000,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5
});
```

#### 2. 连接和认证
```javascript
// 连接WebSocket
await imClient.connect();

// 监听认证结果
imClient.on('authenticated', () => {
  console.log('认证成功，可以开始聊天');
});

imClient.on('authFailed', (error) => {
  console.error('认证失败:', error.message);
});
```

#### 3. 发送单聊消息
```javascript
// 发送单聊消息
const message = {
  toUser: 123,
  content: '你好，这是一条单聊消息'
};

imClient.sendPrivateMessage(message)
  .then(result => {
    console.log('消息发送成功:', result);
  })
  .catch(error => {
    console.error('消息发送失败:', error);
  });
```

#### 4. 接收消息
```javascript
// 监听接收到的消息
imClient.on('messageReceived', (message) => {
  console.log('收到新消息:', message);
  // 更新UI显示消息
  updateChatUI(message);
});
```

### 错误处理策略

#### 1. 连接错误
```javascript
const ConnectionError = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR', 
  AUTH_FAILED: 'AUTH_FAILED',
  HEARTBEAT_TIMEOUT: 'HEARTBEAT_TIMEOUT'
};

// 错误处理
imClient.on('error', (error) => {
  switch(error.type) {
    case ConnectionError.NETWORK_ERROR:
      // 网络错误，尝试重连
      handleNetworkError(error);
      break;
    case ConnectionError.AUTH_FAILED:
      // 认证失败，提示用户重新登录
      handleAuthError(error);
      break;
    case ConnectionError.HEARTBEAT_TIMEOUT:
      // 心跳超时，重新连接
      handleHeartbeatTimeout(error);
      break;
  }
});
```

#### 2. 消息发送错误
```javascript
// 消息发送失败处理
imClient.on('messageFailed', (error) => {
  const { messageId, errorCode, errorMessage } = error;
  
  // 根据错误码处理
  switch(errorCode) {
    case 40100: // 未登录
      showError('请先登录');
      break;
    case 40400: // 用户不存在
      showError('目标用户不存在');
      break;
    case 50000: // 系统错误
      showError('系统繁忙，请稍后重试');
      break;
    default:
      showError(errorMessage || '发送失败');
  }
});
```

#### 3. 重连策略
```javascript
class ReconnectManager {
  constructor(client) {
    this.client = client;
    this.attempts = 0;
    this.maxAttempts = 5;
    this.baseDelay = 1000;
  }
  
  async reconnect() {
    if (this.attempts >= this.maxAttempts) {
      throw new Error('重连次数超过限制');
    }
    
    this.attempts++;
    const delay = this.baseDelay * Math.pow(2, this.attempts - 1); // 指数退避
    
    console.log(`第${this.attempts}次重连，${delay}ms后开始...`);
    await this.sleep(delay);
    
    try {
      await this.client.connect();
      this.attempts = 0; // 重连成功，重置计数
    } catch (error) {
      console.error('重连失败:', error);
      return this.reconnect(); // 递归重连
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 性能优化

#### 1. 消息队列
```javascript
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  enqueue(message) {
    this.queue.push(message);
    this.process();
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      try {
        await this.sendMessage(message);
      } catch (error) {
        // 发送失败，重新入队
        this.queue.unshift(message);
        break;
      }
    }
    
    this.processing = false;
  }
}
```

#### 2. 消息去重
```javascript
class MessageDeduplicator {
  constructor() {
    this.messageIds = new Set();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }
  
  isDuplicate(messageId) {
    if (this.messageIds.has(messageId)) {
      return true;
    }
    this.messageIds.add(messageId);
    return false;
  }
  
  cleanup() {
    // 清理过期的消息ID
    if (this.messageIds.size > 1000) {
      this.messageIds.clear();
    }
  }
}
```

### 安全考虑

#### 1. Token管理
```javascript
class TokenManager {
  constructor() {
    this.token = null;
    this.refreshTimer = null;
  }
  
  setToken(token) {
    this.token = token;
    this.scheduleRefresh();
  }
  
  scheduleRefresh() {
    // 在token过期前刷新
    const refreshTime = this.getTokenExpireTime() - Date.now() - 60000; // 提前1分钟
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }
  
  async refreshToken() {
    try {
      const newToken = await this.requestNewToken();
      this.setToken(newToken);
    } catch (error) {
      console.error('Token刷新失败:', error);
      // 通知用户重新登录
      this.emit('tokenExpired');
    }
  }
}
```

#### 2. 消息加密（可选）
```javascript
class MessageEncryption {
  constructor(key) {
    this.key = key;
  }
  
  encrypt(message) {
    // 实现消息加密逻辑
    return encryptedMessage;
  }
  
  decrypt(encryptedMessage) {
    // 实现消息解密逻辑
    return message;
  }
}
```

## 交付要求

### 1. 代码结构
```
src/
├── im/
│   ├── client/
│   │   ├── IMClient.js          # 主客户端类
│   │   ├── ConnectionManager.js # 连接管理
│   │   ├── MessageHandler.js    # 消息处理
│   │   └── ReconnectManager.js  # 重连管理
│   ├── utils/
│   │   ├── EventEmitter.js      # 事件发射器
│   │   ├── MessageQueue.js      # 消息队列
│   │   └── TokenManager.js      # Token管理
│   ├── constants/
│   │   └── MessageTypes.js      # 消息类型常量
│   └── index.js                 # 入口文件
```

### 2. 文档要求
- API文档：详细的接口说明和使用示例
- 集成指南：如何集成到现有项目
- 故障排除：常见问题和解决方案
- 更新日志：版本变更记录

### 3. 测试用例
```javascript
describe('IM Client', () => {
  test('应该能够成功连接WebSocket', async () => {
    const client = new IMClient(config);
    await client.connect();
    expect(client.isConnected()).toBe(true);
  });
  
  test('应该能够成功认证', async () => {
    const client = new IMClient(config);
    await client.connect();
    const result = await client.authenticate();
    expect(result.success).toBe(true);
  });
  
  test('应该能够发送单聊消息', async () => {
    const client = new IMClient(config);
    await client.connect();
    await client.authenticate();
    
    const message = { toUser: 123, content: 'test message' };
    const result = await client.sendPrivateMessage(message);
    expect(result.success).toBe(true);
  });
  
  test('应该能够处理连接断开和重连', async () => {
    const client = new IMClient(config);
    await client.connect();
    
    // 模拟连接断开
    client.disconnect();
    expect(client.isConnected()).toBe(false);
    
    // 等待自动重连
    await new Promise(resolve => {
      client.on('reconnected', resolve);
    });
    expect(client.isConnected()).toBe(true);
  });
});
```

## 注意事项

1. **消息ID生成**: 单聊消息使用时间戳作为msgId，群聊消息使用"时间戳_随机字符串"格式
2. **类型转换**: toUser字段必须是数字类型，不能是字符串
3. **心跳频率**: 建议30-60秒发送一次心跳，避免连接超时
4. **错误处理**: 必须处理所有可能的错误情况，提供友好的用户提示
5. **性能优化**: 大量消息时要考虑消息队列和去重机制
6. **兼容性**: 确保在主流浏览器中正常工作
7. **内存管理**: 及时清理事件监听器和定时器，避免内存泄漏

## 开发建议

1. **分阶段开发**: 先实现基础连接和认证，再添加消息功能，最后完善重连和错误处理
2. **充分测试**: 在各种网络环境下测试，包括弱网络、断网重连等场景
3. **日志记录**: 添加详细的日志记录，便于调试和问题排查
4. **用户体验**: 提供清晰的状态提示和错误信息，让用户了解当前状态
5. **扩展性**: 预留接口便于后续添加群聊、文件传输等功能

通过以上指南，你可以开发出一个功能完整、稳定可靠的前端IM单聊模块。记住要充分测试各种边界情况，确保用户体验的流畅性。