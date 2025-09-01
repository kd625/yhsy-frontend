// 图书相关类型定义

// 图书基础信息
export interface Book {
  id: number
  sellerId: number
  buyerId: number
  categoryId: number
  bookName: string
  imageUrl: string
  description: string
  isbn: string
  bookAuthor: string
  bookPublisher: string
  bookPrice: number  // 单位为分
  bookStatus: number // 0在售 1已预订 2已售出 3已下架
  createTime: string
  updateTime: string
  isDelete: number
}

// 图书搜索请求
export interface BookSearchRequest {
  searchText: string
  categoryId?: number
  pageSize?: number
  pageNum?: number
  lowPrice?: number
  highPrice?: number
}

// 图书搜索结果
export interface BookSearchResult extends Omit<Book, 'sellerId' | 'buyerId' | 'createTime' | 'updateTime'> {
  highlightString: string
}

// 图书列表分页请求
export interface BookListPageRequest {
  current: number
  pageSize: number
  categoryId?: number
  bookStatus?: number
}

// 图书添加请求
export interface BookAddRequest {
  categoryId: number
  bookName: string
  imageUrl: string
  description: string
  isbn: string
  bookAuthor: string
  bookPublisher: string
  bookPrice: number
}

// 图书更新请求
export interface BookUpdateRequest {
  id: number
  categoryId?: number
  bookName?: string
  imageUrl?: string
  description?: string
  isbn?: string
  bookAuthor?: string
  bookPublisher?: string
  bookPrice?: number
  bookStatus?: number
}

// 图书分类
export interface BookCategory {
  id: number
  categoryName: string
  description?: string
  createTime: string
  updateTime: string
}

// 分页响应数据
export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// 图书卡片显示信息
export interface BookCard {
  id: number
  bookName: string
  bookAuthor: string
  bookPrice: number
  imageUrl: string
  bookStatus: number
}

// 搜索筛选条件
export interface SearchFilters {
  categoryId?: number
  lowPrice?: number
  highPrice?: number
  bookStatus?: number
}