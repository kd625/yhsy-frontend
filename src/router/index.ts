import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

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

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  
  // 暂时跳过权限检查，等Pinia初始化完成后再启用
  // TODO: 在应用初始化完成后启用权限检查
  /*
  const userStore = useUserStore()
  
  // 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.isLogin) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next({ path: '/' })
    return
  }
  
  // 检查是否只允许未登录用户访问（如登录、注册页面）
  if (to.meta.requiresGuest && userStore.isLogin) {
    next({ path: '/' })
    return
  }
  */
  
  next()
})

export default router