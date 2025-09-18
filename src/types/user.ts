// 用户相关类型定义

// 用户视图对象
export interface UserVO {
  id: number
  userName: string
  userAccount: string
  userAvatar: string
  gender: number
  userRole: string
  createTime: string
  updateTime: string
}

// 用户登录请求
export interface UserLoginRequest {
  userAccount: string
  userPassword: string
  captcha?: string
  captchaKey?: string
}

// 用户注册请求
export interface UserRegisterRequest {
  userName: string
  userAccount: string
  userPassword: string
  checkPassword: string
}

// 用户添加请求
export interface UserAddRequest {
  userName: string
  userAccount: string
  userPassword: string
  checkPassword: string
}

// 用户更新请求
export interface UserUpdateRequest {
  id: number
  userName?: string
  userAccount?: string
  userAvatar?: string
  gender?: number
  userRole?: string
  userPassword?: string
}

// 验证码响应对象
export interface CaptchaVO {
  key: string
  image: string
}

// 完整用户信息（包含敏感信息）
export interface User {
  id: number
  userName: string
  userAccount: string
  userAvatar: string
  gender: number
  userRole: string
  userPassword: string
  createTime: string
  updateTime: string
  userPhone: string
  isDelete: number
}