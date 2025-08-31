# 砚湖书影前端项目规则

## 项目概述

砚湖书影是一个基于Vue3的二手书分享平台前端项目，后端采用SpringCloud + MySQL + Redis + ES + Sa-Token架构。

### 技术栈
- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由管理**: Vue Router 4
- **HTTP客户端**: Axios
- **后端API**: SpringCloud微服务架构
- **权限认证**: Sa-Token

## 项目结构规范

```
src/
├── components/          # 公共组件
│   ├── Layout/         # 布局组件
│   └── Common/         # 通用组件
├── views/              # 页面组件
│   ├── User/          # 用户相关页面
│   ├── Book/          # 图书相关页面
│   └── Admin/         # 管理员页面
├── router/            # 路由配置
├── store/             # Pinia状态管理
│   └── modules/       # 状态模块
├── utils/             # 工具函数
│   ├── request.ts     # HTTP请求封装
│   ├── auth.ts        # 权限相关工具
│   └── constants.ts   # 常量定义
├── types/             # TypeScript类型定义
└── assets/            # 静态资源
```

## 功能模块规范

### 用户模块 (P0优先级)

#### 功能清单
- 用户注册 (`/user/register`)
- 用户登录 (`/user/login`)
- 用户注销 (`/user/logout`)
- 获取当前用户信息 (`/user/get/login`)
- 管理员用户管理 (CRUD操作)

#### 页面组件
- `views/User/Login.vue` - 登录页面
- `views/User/Register.vue` - 注册页面
- `views/User/Profile.vue` - 用户个人信息页面
- `views/Admin/UserManagement.vue` - 用户管理页面

#### 状态管理
- `store/modules/user.ts` - 用户状态管理
- 包含用户信息、登录状态、权限信息等

### 图书模块 (P0优先级)

#### 功能清单
- 搜索图书 (`/book/search`) - 支持ES全文搜索
- 查看图书详情 (`/book/get`)
- 发布图书 (`/book/add`)
- 预订图书 (`/book/order`)
- 管理员图书管理 (CRUD操作)
- 分页获取图书列表 (`/book/list/page`)

#### 页面组件
- `views/Book/BookList.vue` - 图书列表页面
- `views/Book/BookDetail.vue` - 图书详情页面
- `views/Book/BookPublish.vue` - 发布图书页面
- `views/Book/BookSearch.vue` - 图书搜索页面
- `views/Admin/BookManagement.vue` - 图书管理页面

#### 状态管理
- `store/modules/book.ts` - 图书状态管理
- 包含图书列表、搜索结果、当前图书详情等

### 文件模块 (P0优先级)

#### 功能清单
- 图片文件上传 (`/file/upload`) - 支持COS云存储

#### 组件
- `components/Common/FileUpload.vue` - 文件上传组件
- `components/Common/ImagePreview.vue` - 图片预览组件

## API调用规范

### 基础配置
- **Base URL**: `http://localhost:8080` (开发环境)
- **请求格式**: JSON
- **响应格式**: 统一的BaseResponse结构

### 响应数据结构
```typescript
interface BaseResponse<T> {
  code: number;     // 状态码，0表示成功
  data: T;          // 响应数据
  message: string;  // 响应消息
}
```

### 权限认证
- 使用Sa-Token进行权限认证
- 登录后将token存储在localStorage中
- 每次请求需要在请求头中携带token
- 实现自动token刷新机制

### 错误处理
- 统一的错误拦截和处理
- 根据错误码显示相应的错误信息
- 401错误自动跳转到登录页面
- 403错误显示权限不足提示

## 编码规范

### Vue组件规范
- 使用Composition API + `<script setup>`语法
- 组件名使用PascalCase命名
- Props和Emits使用TypeScript类型定义
- 使用`defineProps`和`defineEmits`定义组件接口

### TypeScript规范
- 严格模式开启
- 所有API接口定义对应的TypeScript类型
- 使用interface定义数据结构
- 避免使用any类型

### 样式规范
- 使用Element Plus组件库
- 自定义样式使用scoped CSS
- 响应式设计，支持移动端适配
- 统一的主题色彩和字体规范

## 路由规范

### 路由结构
```typescript
// 公共路由
/login          // 登录页面
/register       // 注册页面
/              // 首页 (图书列表)
/book/:id      // 图书详情页面
/search        // 搜索页面

// 用户路由 (需要登录)
/profile       // 个人信息
/publish       // 发布图书
/my-books      // 我的图书

// 管理员路由 (需要管理员权限)
/admin/users   // 用户管理
/admin/books   // 图书管理
```

### 路由守卫
- 实现全局路由守卫
- 检查用户登录状态
- 验证页面访问权限
- 未登录用户重定向到登录页面

## 状态管理规范

### Pinia Store结构
```typescript
// user store
interface UserState {
  userInfo: UserVO | null;
  isLogin: boolean;
  token: string | null;
  isAdmin: boolean;
}

// book store
interface BookState {
  bookList: Book[];
  currentBook: Book | null;
  searchResults: BookSearchResult[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}
```

## 数据类型定义

### 用户相关类型
```typescript
interface UserVO {
  id: number;
  userName: string;
  userAccount: string;
  userAvatar: string;
  gender: number;
  userRole: string;
  createTime: string;
  updateTime: string;
}

interface UserLoginRequest {
  userAccount: string;
  userPassword: string;
}

interface UserRegisterRequest {
  userName: string;
  userAccount: string;
  userPassword: string;
  checkPassword: string;
}
```

### 图书相关类型
```typescript
interface Book {
  id: number;
  sellerId: number;
  buyerId: number;
  categoryId: number;
  bookName: string;
  imageUrl: string;
  description: string;
  isbn: string;
  bookAuthor: string;
  bookPublisher: string;
  bookPrice: number;  // 单位为分
  bookStatus: number; // 0在售 1已预订 2已售出 3已下架
  createTime: string;
  updateTime: string;
  isDelete: number;
}

interface BookSearchRequest {
  searchText: string;
  categoryId?: number;
  pageSize?: number;
  pageNum?: number;
  lowPrice?: number;
  highPrice?: number;
}

interface BookSearchResult extends Omit<Book, 'sellerId' | 'buyerId' | 'createTime' | 'updateTime'> {
  highlightString: string;
}
```

## 开发规范

### 组件开发
- 组件应该是可复用和可测试的
- 使用Props进行父子组件通信
- 使用Emits进行子父组件通信
- 复杂状态使用Pinia管理

### API调用
- 所有API调用都应该通过统一的request工具
- 实现请求和响应拦截器
- 处理loading状态和错误状态
- 支持请求取消和重试机制

### 性能优化
- 使用懒加载优化路由
- 图片懒加载和压缩
- 合理使用Vue的响应式特性
- 避免不必要的重新渲染

## 部署规范

### 构建配置
- 开发环境使用Vite dev server
- 生产环境使用Vite build
- 配置环境变量管理不同环境的API地址

### 环境配置
```typescript
// 开发环境
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=砚湖书影 - 开发环境

// 生产环境
VITE_API_BASE_URL=https://api.yhsy.com
VITE_APP_TITLE=砚湖书影
```

## 安全规范

### 前端安全
- 所有用户输入都需要进行验证和转义
- 敏感信息不在前端存储
- 使用HTTPS协议
- 实现CSP (Content Security Policy)

### 权限控制
- 基于Sa-Token的权限认证
- 前端路由权限控制
- 接口权限验证
- 管理员功能权限隔离

## 测试规范

### 单元测试
- 使用Vitest进行单元测试
- 测试覆盖率要求达到80%以上
- 重要的工具函数和组件必须有测试用例

### 集成测试
- API接口集成测试
- 用户操作流程测试
- 权限验证测试

这个项目规则文件将指导整个前端项目的开发，确保代码质量和项目的可维护性。