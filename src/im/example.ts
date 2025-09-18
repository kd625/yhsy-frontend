// IMClient 使用示例
import { IMClient } from './IMClient';

// 创建IM客户端实例
const imClient = new IMClient({
  url: 'ws://localhost:8088/websocket',
  accessToken: 'your-access-token-here',
  heartbeatInterval: 30000,     // 30秒心跳间隔
  reconnectDelay: 1000,         // 初始重连延迟1秒
  maxReconnectAttempts: 5       // 最大重连次数5次
});

// 监听连接事件
imClient.on('connected', () => {
  console.log('WebSocket连接已建立');
});

imClient.on('disconnected', () => {
  console.log('WebSocket连接已断开');
});

imClient.on('reconnecting', (data) => {
  console.log(`正在进行第${data.attempt}次重连...`);
});

imClient.on('reconnected', () => {
  console.log('重连成功！');
});

// 监听认证事件
imClient.on('authenticated', () => {
  console.log('用户认证成功');
  
  // 认证成功后可以发送消息
  sendTestMessage();
});

imClient.on('authFailed', (data) => {
  console.error('认证失败:', data.error);
});

// 监听消息事件
imClient.on('messageReceived', (data) => {
  console.log('收到新消息:', data.content);
});

imClient.on('messageSent', (data) => {
  console.log(`消息发送成功，msgId: ${data.msgId}`);
});

imClient.on('messageFailed', (data) => {
  console.error(`消息发送失败，msgId: ${data.msgId}, 错误: ${data.error}`);
});

// 监听心跳事件
imClient.on('heartbeatSent', () => {
  console.log('心跳包已发送');
});

imClient.on('heartbeatReceived', () => {
  console.log('收到心跳响应');
});

// 监听错误事件
imClient.on('error', (data) => {
  console.error(`发生错误 [${data.type}]: ${data.message}`);
});

// 发送测试消息的函数
async function sendTestMessage() {
  try {
    const msgId = await imClient.sendPrivateMessage(123, 'Hello, this is a test message!');
    console.log(`消息已发送，msgId: ${msgId}`);
  } catch (error) {
    console.error('发送消息失败:', error);
  }
}

// 连接到服务器
async function connectToServer() {
  try {
    await imClient.connect();
    console.log('开始连接到IM服务器...');
  } catch (error) {
    console.error('连接失败:', error);
  }
}

// 断开连接
function disconnectFromServer() {
  imClient.disconnect();
  console.log('已断开与IM服务器的连接');
}

// 导出实例和方法供其他模块使用
export {
  imClient,
  connectToServer,
  disconnectFromServer,
  sendTestMessage
};

// 使用示例：
// 1. 调用 connectToServer() 连接服务器
// 2. 监听 'authenticated' 事件确认认证成功
// 3. 调用 sendPrivateMessage() 发送消息
// 4. 监听 'messageReceived' 事件接收消息
// 5. 调用 disconnectFromServer() 断开连接