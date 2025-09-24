# WebSocket 消息格式接口文档

## 概述

本文档描述了 nettychat-service 项目中 WebSocket 通信的消息格式规范。所有消息都基于统一的 `Invocation` 协议格式进行传输。

## 连接信息

- **WebSocket 端点**: `ws://localhost:8999/ws`
- **协议**: WebSocket over HTTP
- **消息格式**: JSON

## 消息协议结构

### 基础协议格式 (Invocation)

所有 WebSocket 消息都遵循以下统一格式：

```json
{
  "type": "消息类型",
  "message": "消息内容的JSON字符串"
}
```

**字段说明:**
- `type` (String): 消息类型标识符，对应 MessageTypeConstant 枚举值
- `message` (String): 具体消息内容的 JSON 字符串

## 消息类型列表

| 消息类型 | 代码 | 说明 | 方向 |
|---------|------|------|------|
| AUTH_REQUEST | 1 | 认证请求 | 客户端 → 服务端 |
| AUTH_RESPONSE | 2 | 认证响应 | 服务端 → 客户端 |
| CHAT_REDIRECT_TO_USER_REQUEST | 3 | 聊天重定向请求 | 服务端 → 客户端 |
| CHAT_SEND_RESPONSE | 4 | 聊天发送响应 | 服务端 → 客户端 |
| CHAT_SEND_TO_ONE_REQUEST | 6 | 单发消息请求 | 客户端 → 服务端 |
| HEARTBEAT_REQUEST | 7 | 心跳请求 | 客户端 → 服务端 |
| HEARTBEAT_RESPONSE | 8 | 心跳响应 | 服务端 → 客户端 |
| CHAT_READ_RECEIPT_REQUEST | 9 | 已读回执请求 | 客户端 → 服务端 |
| CHAT_READ_RECEIPT_RESPONSE | 10 | 已读回执响应 | 服务端 → 客户端 |
| CHAT_ERROR_RESPONSE | 11 | 错误响应 | 服务端 → 客户端 |

## 详细消息格式

### 1. 认证消息

#### 1.1 认证请求 (AUTH_REQUEST)

**用途**: 客户端向服务端发送认证信息

```json
{
  "type": "AUTH_REQUEST",
  "message": "{\"accessToken\": \"用户访问令牌\"}"
}
```

**message 字段内容**:
```json
{
  "accessToken": "string"  // 用户访问令牌
}
```

#### 1.2 认证响应 (AUTH_RESPONSE)

**用途**: 服务端返回认证结果

```json
{
  "type": "AUTH_RESPONSE",
  "message": "{\"code\": 200, \"message\": \"认证成功\", \"data\": {\"userId\": 123, \"username\": \"用户名\"}}"
}
```

**message 字段内容**:
```json
{
  "code": "number",      // 响应码 (200: 成功, 其他: 失败)
  "message": "string",   // 响应消息
  "data": {              // 认证成功时的用户信息
    "userId": "number",
    "username": "string"
  }
}
```

### 2. 聊天消息

#### 2.1 单发消息请求 (CHAT_SEND_TO_ONE_REQUEST)

**用途**: 发送消息给指定用户

```json
{
  "type": "CHAT_SEND_TO_ONE_REQUEST",
  "message": "{\"msgId\": 1640995200000, \"toUser\": 456, \"content\": \"Hello!\"}"
}
```

**message 字段内容**:
```json
{
  "msgId": "number",     // 消息ID (Long类型，建议使用时间戳)
  "toUser": "number",    // 接收用户ID
  "content": "string"    // 消息内容
}
```

#### 2.2 聊天发送响应 (CHAT_SEND_RESPONSE)

**用途**: 服务端确认消息发送结果

```json
{
  "type": "CHAT_SEND_RESPONSE",
  "message": "{\"msgId\": \"msg_1640995200000\", \"code\": 200, \"message\": \"发送成功\"}"
}
```

**message 字段内容**:
```json
{
  "msgId": "string|number", // 原消息ID
  "code": "number",         // 响应码
  "message": "string"       // 响应消息
}
```

#### 2.3 聊天重定向请求 (CHAT_REDIRECT_TO_USER_REQUEST)

**用途**: 服务端将消息转发给目标用户

```json
{
  "type": "CHAT_REDIRECT_TO_USER_REQUEST",
  "message": "{\"msgId\": 1640995200000, \"sessionId\": 1640995200000, \"content\": \"Hello!\"}"
}
```

**message 字段内容**:
```json
{
  "msgId": "number",     // 消息ID
  "sessionId": "number",  // 会话ID
  "content": "string"    // 消息内容
}
```

### 3. 心跳消息

#### 3.1 心跳请求 (HEARTBEAT_REQUEST)

**用途**: 客户端发送心跳保持连接

```json
{
  "type": "HEARTBEAT_REQUEST",
  "message": "{}"
}
```

**message 字段内容**: 空对象
```json
{}
```

#### 3.2 心跳响应 (HEARTBEAT_RESPONSE)

**用途**: 服务端响应心跳

```json
{
  "type": "HEARTBEAT_RESPONSE",
  "message": "{}"
}
```

**message 字段内容**: 空对象
```json
{}
```

### 4. 已读回执消息

#### 4.1 已读回执请求 (CHAT_READ_RECEIPT_REQUEST)

**用途**: 客户端发送消息已读确认

```json
{
  "type": "CHAT_READ_RECEIPT_REQUEST",
  "message": "{\"msgId\": 1640995200000, \"fromUser\": 123}"
}
```

**message 字段内容**:
```json
{
  "msgId": "number",     // 已读消息ID
  "fromUser": "number"   // 消息发送者ID
}
```

#### 4.2 已读回执响应 (CHAT_READ_RECEIPT_RESPONSE)

**用途**: 服务端确认已读回执处理结果

```json
{
  "type": "CHAT_READ_RECEIPT_RESPONSE",
  "message": "{\"msgId\": 1640995200000, \"code\": 200, \"message\": \"已读回执处理成功\"}"
}
```

**message 字段内容**:
```json
{
  "msgId": "number",     // 消息ID
  "code": "number",      // 响应码
  "message": "string"    // 响应消息
}
```

### 5. 错误响应

#### 5.1 错误响应 (CHAT_ERROR_RESPONSE)

**用途**: 服务端返回错误信息

```json
{
  "type": "CHAT_ERROR_RESPONSE",
  "message": "{\"code\": 400, \"message\": \"请求参数错误\", \"data\": null}"
}
```

**message 字段内容**:
```json
{
  "code": "number",      // 错误码
  "message": "string",   // 错误描述
  "data": "any"          // 附加数据 (可为null)
}
```

## 常见错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 用户不存在或不在线 |
| 500 | 服务器内部错误 |

## 连接流程

1. **建立连接**: 客户端连接到 `ws://localhost:8999/ws`
2. **身份认证**: 发送 `AUTH_REQUEST` 消息进行认证
3. **等待认证响应**: 接收 `AUTH_RESPONSE` 确认认证结果
4. **正常通信**: 认证成功后可发送聊天消息和心跳
5. **保持连接**: 定期发送 `HEARTBEAT_REQUEST` 保持连接活跃

## 示例代码

### JavaScript 客户端示例

```javascript
// 建立WebSocket连接
const ws = new WebSocket('ws://localhost:8999/ws');

// 连接成功后发送认证请求
ws.onopen = function() {
    const authMessage = {
        type: 'AUTH_REQUEST',
        message: JSON.stringify({
            accessToken: 'your_access_token_here'
        })
    };
    ws.send(JSON.stringify(authMessage));
};

// 处理接收到的消息
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('收到消息:', data);
    
    switch(data.type) {
        case 'AUTH_RESPONSE':
            const authResult = JSON.parse(data.message);
            if (authResult.code === 200) {
                console.log('认证成功');
                // 开始发送心跳
                startHeartbeat();
            }
            break;
        case 'CHAT_REDIRECT_TO_USER_REQUEST':
            const chatMessage = JSON.parse(data.message);
            console.log('收到聊天消息:', chatMessage);
            break;
        case 'HEARTBEAT_RESPONSE':
            console.log('心跳响应');
            break;
    }
};

// 发送单聊消息
function sendPrivateMessage(toUserId, content) {
    const message = {
        type: 'CHAT_SEND_TO_ONE_REQUEST',
        message: JSON.stringify({
            msgId: Date.now(),
            toUser: toUserId,
            content: content
        })
    };
    ws.send(JSON.stringify(message));
}

// 发送心跳
function sendHeartbeat() {
    const message = {
        type: 'HEARTBEAT_REQUEST',
        message: JSON.stringify({})
    };
    ws.send(JSON.stringify(message));
}

// 定时发送心跳
function startHeartbeat() {
    setInterval(sendHeartbeat, 30000); // 每30秒发送一次心跳
}
```

## 注意事项

1. **消息ID类型**: 
   - `CHAT_SEND_TO_ONE_REQUEST` 使用 Long 类型的 msgId (建议使用时间戳)

2. **认证要求**: 连接建立后必须先进行认证，未认证的连接无法发送聊天消息

3. **心跳机制**: 建议客户端定期发送心跳消息以保持连接活跃

4. **错误处理**: 客户端应妥善处理各种错误响应，并根据错误码采取相应措施

5. **消息编码**: 所有消息内容都使用 UTF-8 编码的 JSON 格式

6. **连接管理**: 服务端会维护用户连接映射，断线重连时需要重新认证

## 更新日志

- v1.0: 初始版本，包含基础聊天功能
- 支持的消息类型: 认证、单聊、心跳、已读回执、错误响应