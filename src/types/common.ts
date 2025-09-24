// 通用类型定义

// 基础响应结构
export interface BaseResponse<T = any> {
  code: number
  data: T
  message: string
}

// 分页查询参数
export interface PageRequest {
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

// 分页响应数据
export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  orders: OrderItem[]
  optimizeCountSql: boolean
  searchCount: boolean
  countId: string
  maxLimit: number
}

// 排序项
export interface OrderItem {
  column: string
  asc: boolean
}

// 删除请求
export interface DeleteRequest {
  id: number
}

// 通用ID参数
export interface IdRequest {
  id: number
}

// IM历史消息相关类型定义

// 消息分页查询请求参数
export interface MessagePageQueryRequest {
  sessionId: string    // 修改为string类型以避免精度问题
  startMsgId?: number  // 可选，在这个msgId之前的消息
  current?: number     // 当前页号，默认1
  pageSize?: number    // 页面大小，默认10
}

// 历史消息数据结构 - 更新为匹配后端返回的实际结构
export interface HistoryMessage {
  content: string         // 消息内容（直接的字符串，不是JSON）
  messageStatus: number   // 消息状态: 1-已发送, 2-已送达, 3-已读
  senderId: string        // 发送者用户ID（字符串格式）
  sendTime: string        // 发送时间
  msgId?: number          // 消息ID（可选，用于分页加载）
}

// 解析后的消息内容结构
export interface MessageContent {
  content: string         // 实际消息内容
  msgId: number          // 消息ID
  sessionId: string      // 会话ID
}

// IM消息VO - 保留原有结构用于实时消息
export interface ImmessageVO {
  id: number              // 消息ID
  senderId: number        // 发送者用户ID
  receiverId: number      // 接收者用户ID
  messageType: number     // 消息类型
  content: string         // 消息内容
  messageStatus: number   // 消息状态: 1-已发送, 2-已送达, 3-已读
  sendTime: string        // 发送时间
}

// 历史消息响应数据 - 使用HistoryMessage
export interface MessageHistoryResponse {
  records: HistoryMessage[]  // 修改为HistoryMessage数组
  total: number
  size: number
  current: number
  hasNext: boolean        // 是否还有更多历史消息
}