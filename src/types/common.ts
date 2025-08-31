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