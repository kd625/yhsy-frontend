import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { ElMessage } from 'element-plus'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '首页 - 砚湖书影'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/User/Login.vue'),
    meta: {
      title: '登录 - 砚湖书影',
      requiresGuest: true // 只有未登录用户可以访问
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/User/Register.vue'),
    meta: {
      title: '注册 - 砚湖书影',
      requiresGuest: true
    }
  },
  {
    path: '/book/:id',
    name: 'BookDetail',
    component: () => import('@/views/Book/BookDetail.vue'),
    meta: {
      title: '图书详情 - 砚湖书影'
    }
  },
  {
    path: '/search',
    name: 'BookSearch',
    component: () => import('@/views/Book/BookSearch.vue'),
    meta: {
      title: '搜索图书 - 砚湖书影'
    }
  },
  // 需要登录的路由
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/User/Profile.vue'),
    meta: {
      title: '个人中心 - 砚湖书影',
      requiresAuth: true
    }
  },
  {
    path: '/publish',
    name: 'BookPublish',
    component: () => import('@/views/Book/BookPublish.vue'),
    meta: {
      title: '发布图书 - 砚湖书影',
      requiresAuth: true
    }
  },
  {
    path: '/my-books',
    name: 'MyBooks',
    component: () => import('@/views/Book/MyBooks.vue'),
    meta: {
      title: '我的图书 - 砚湖书影',
      requiresAuth: true
    }
  },
  // 管理员路由
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin/Dashboard.vue'),
    meta: {
      title: '管理后台 - 砚湖书影',
      requiresAuth: true,
      requiresAdmin: true
    },
    children: [
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/Admin/UserManagement.vue'),
        meta: {
          title: '用户管理 - 砚湖书影',
          requiresAuth: true,
          requiresAdmin: true
        }
      },
      {
        path: 'books',
        name: 'AdminBooks',
        component: () => import('@/views/Admin/BookManagement.vue'),
        meta: {
          title: '图书管理 - 砚湖书影',
          requiresAuth: true,
          requiresAdmin: true
        }
      }
    ]
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到 - 砚湖书影'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  
  const userStore = useUserStore()
  
  // 如果用户已登录但token无效，先尝试恢复登录状态
  if (userStore.token && !userStore.isLogin) {
    try {
      await userStore.initializeAuth()
    } catch (error) {
      console.error('恢复登录状态失败:', error)
      // 清除无效token
      userStore.logout()
    }
  }
  
  // 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.isLogin) {
    // 未登录，跳转到登录页
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // 检查管理员权限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    // 非管理员，跳转到首页
    next('/')
    return
  }
  
  // 已登录用户访问登录/注册页，跳转到首页
  if (to.meta.guest && userStore.isLogin) {
    next('/')
    return
  }
  
  next()
})

export default router