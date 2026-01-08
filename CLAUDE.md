# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是"砚湖书影"（Yanhu Shuying），一个基于 Vue 3 + TypeScript 的二手图书共享平台单页应用。应用允许用户注册、登录、分享、搜索和预订图书，并具有管理员功能。

## 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器（开发模式）
npm run dev:prod     # 启动开发服务器（生产模式配置）

# 构建和部署
npm run build        # 生产环境构建（包含 TypeScript 编译）
npm run build:dev    # 开发环境构建
npm run preview      # 本地预览生产构建

# 测试
npm run test         # 运行 Vitest 测试
npm run test:ui      # 运行带 UI 的测试
npm run test:coverage # 运行测试并生成覆盖率报告
```

## 架构概述

### 技术栈
- **框架**: Vue 3，使用 Composition API 和 `<script setup>` 语法
- **语言**: TypeScript（严格模式）
- **构建工具**: Vite 7.x
- **状态管理**: Pinia（Vuex 的现代替代方案）
- **路由**: Vue Router 4，使用 history 模式和懒加载
- **UI 库**: Element Plus 及图标库
- **HTTP 客户端**: Axios，带拦截器
- **实时通信**: WebSocket（自定义 IMClient，位于 `src/im/`）
- **图表**: ECharts 与 vue-echarts 集成
- **测试**: Vitest，使用 jsdom 环境
- **样式**: SCSS

### 核心架构模式

**基于 Token 的认证**
- 使用存储在 localStorage 中的 `satoken`（服务器管理的令牌）
- 在请求拦截器中添加自定义 `satoken` 请求头
- 通过 `utils/auth.ts` 中的 `getSaToken()` 获取令牌
- 401 响应或令牌过期时自动登出

**状态管理结构**
- `userStore` (`store/modules/user.ts`)：认证状态、用户信息、登录/登出方法
- `bookStore` (`store/modules/book.ts`)：图书列表、当前图书、搜索参数
- `imStore` (`store/im.ts`)：实时消息、WebSocket 连接、会话、消息历史
- 用户信息持久化到 localStorage

**API 架构**
- 基础 URL 通过环境变量配置（`.env.development`、`.env.production`）
- 开发环境：`http://114.132.232.212:8080`
- 生产环境：`https://kevincx.site/api`
- 在 `utils/request.ts` 中配置统一的 Axios 实例，包含请求/响应拦截器
- 统一响应格式：`{ code: number, message: string, data: any }`
- 认证自定义请求头：`satoken`（从 localStorage 获取）
- 自动错误处理，显示 toast 提示
- 消息历史 API 集成在 request 工具中

**路由保护**
- 使用 meta 字段的懒加载路由进行保护（`requiresAuth`、`requiresAdmin`、`requiresGuest`）
- 基于角色的访问控制（用户 vs 管理员）
- 管理员路由位于 `/admin` 下，包含嵌套子路由
- 未认证访问自动重定向到登录页
- 使用 `initializeAuth()` 恢复现有令牌的认证状态

**WebSocket/IM 架构**
- 在 `src/im/IMClient.ts` 中自定义 `IMClient` 类用于 WebSocket 通信
- 事件驱动架构，带有类型化的事件处理器
- 功能：私聊、消息历史、送达状态
- 连接状态管理（连接中、已连接、已认证、已断开）
- 消息状态跟踪：pending（待发送）、sent（已发送）、delivered（已送达）、failed（失败）

### 项目结构

```
src/
├── im/               # WebSocket 客户端和 IM 工具
├── router/           # Vue Router 配置和路由守卫
├── store/            # Pinia 状态管理（user、book、im）
│   └── modules/      # 模块化的 store 定义
├── types/            # TypeScript 类型定义（book、user、common）
├── utils/            # 工具函数（request.ts、auth.ts、im.ts）
├── views/            # 按功能组织的页面组件
│   ├── Admin/        # 管理后台（用户、图书、统计）
│   ├── Book/         # 图书详情、搜索、发布
│   ├── Chat/         # 聊天室和消息
│   ├── My/           # 用户发布的图书、订单
│   └── User/         # 登录、注册、个人中心
├── components/       # 共享组件
│   └── Layout/       # 布局组件（AdminLayout）
└── assets/           # 静态资源
```

## 开发指南

### 代码风格
- 严格的 TypeScript - 不允许使用 `any` 类型
- 使用 `<script setup>` 语法的 Composition API
- 使用 Element Plus 组件保持 UI 一致性
- 按领域模块化组织 API

### 认证流程
1. 登录时通过 `utils/auth.ts` 将 `satoken` 存储到 localStorage
2. 请求拦截器为 API 调用添加 `satoken` 请求头（登录/注册接口除外）
3. 响应拦截器处理认证错误（401 → 清除令牌，重定向到登录页）
4. 令牌以 `satoken` 为键存储在 localStorage 中
5. 令牌过期或 401 响应时自动登出

### WebSocket/IM 流程
1. 用户登录时使用访问令牌初始化 `IMClient`
2. 连接到 WebSocket 服务器（`VITE_WS_BASE_URL`）
3. 使用令牌进行连接认证
4. 订阅事件：`connected`（已连接）、`authenticated`（已认证）、`messageReceived`（收到消息）、`messageSent`（消息已发送）、`messageFailed`（消息失败）
5. 使用 `imStore` 管理会话和消息状态
6. 打开会话时通过 REST API 加载消息历史

### 错误处理
- Axios 拦截器提供集中式错误处理
- 所有错误以 Element Plus 消息形式显示
- 特定处理 401/403/404/500 状态码
- API 响应 `code` 字段中的业务逻辑错误

### 开发新功能时
- API 端点应添加到 `utils/request.ts` 中的集中式 `service`
- 在 `/types/` 中先定义 TypeScript 类型
- 使用 Pinia store 管理需要在组件间共享的状态
- 使用 meta 字段实现受保护页面的路由守卫（`requiresAuth`、`requiresAdmin`）
- 使用 Element Plus 组件保持 UI 一致性
- 对于 WebSocket 功能，使用现有的 `IMClient` 并根据需要扩展
- 使用路径别名 `@/` 引用 `src/` 目录下的文件

## 重要说明

- 项目使用 `satoken`（存储在 localStorage 中）进行认证，而非 cookies
- API 端点按领域组织在 `utils/request.ts` 中，导出 messageAPI
- 所有 API 请求通过 `utils/request.ts` 中的集中式 Axios 实例
- 路由保护通过 `router/index.ts` 中的 meta 字段和导航守卫处理
- TypeScript 配置为严格模式 - 需要保持类型安全
- WebSocket URL 通过 `VITE_WS_BASE_URL` 环境变量配置
- 路径别名 `@` 配置为解析到 `src/` 目录
- 项目使用 Vitest 和 jsdom 进行测试（非 Jest）
- **ID 精度问题**：所有后端返回的 ID 字段（如 userId、bookId、sessionId 等）应使用 `string` 类型而非 `number` 类型，避免 JavaScript 长整型精度丢失问题（JavaScript Number 只能精确表示 -2^53+1 到 2^53-1 之间的整数）

## Claude Code 规则

1. **中文交流**：必须使用中文与用户进行对话和交流
2. **代码清理**：发现无用的代码段时，主动删除并告知用户已删除的内容