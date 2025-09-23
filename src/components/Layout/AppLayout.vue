<template>
  <el-container class="app-layout">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-content">
        <!-- 左侧 Logo 和项目名称 -->
        <div class="logo-section">
          <router-link to="/" class="logo-link">
            <el-icon class="logo-icon" :size="32">
              <Reading />
            </el-icon>
            <span class="project-name">砚湖书影</span>
          </router-link>
        </div>
        
        <!-- 导航菜单 -->
        <el-menu
          mode="horizontal"
          :default-active="activeIndex"
          class="nav-menu"
          @select="handleSelect"
        >
          <!-- 首页 -->
          <el-menu-item index="/">首页</el-menu-item>
          
          <!-- 登录后显示的菜单 -->
          <template v-if="userStore.isLogin">
            <!-- 发布图书 -->
            <el-menu-item index="/publish">发布图书</el-menu-item>
            
            <!-- 我的图书下拉菜单 -->
            <el-sub-menu index="my-books" class="my-books-submenu">
              <template #title>我的图书</template>
              <el-menu-item index="/my/published">我发布的</el-menu-item>
              <el-menu-item index="/my/orders">我预订的</el-menu-item>
            </el-sub-menu>
            
            <!-- 后台管理（仅管理员可见） -->
            <el-menu-item v-if="userStore.isAdmin" index="/admin">后台管理</el-menu-item>
            
            <!-- 用户下拉菜单 -->
            <el-dropdown @command="handleUserCommand" class="user-dropdown">
              <span class="user-info">
                <el-avatar :size="28" :src="userStore.userInfo?.userAvatar" class="nav-avatar">
                  <el-icon><User /></el-icon>
                </el-avatar>
                <span class="username">{{ userStore.userInfo?.userName }}</span>
                <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <el-icon><User /></el-icon>
                    个人中心
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          
          <!-- 未登录时显示的菜单 -->
          <template v-else>
            <el-menu-item index="/login">登录</el-menu-item>
            <el-menu-item index="/register">注册</el-menu-item>
          </template>
        </el-menu>
      </div>
    </el-header>
    
    <!-- 主内容区域 -->
    <el-main class="app-main">
      <router-view />
    </el-main>
    
    <!-- 底部页脚 -->
    <el-footer class="app-footer">
      <div class="footer-content">
        <p>&copy; 2024 砚湖书影</p>
        <p class="footer-desc">让知识在这里流转，让书香在此传递</p>
      </div>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Reading, User, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 当前激活的菜单项
const activeIndex = computed(() => route.path)

// 处理菜单选择
const handleSelect = (key: string) => {
  if (key !== 'logout' && key !== 'user') {
    router.push(key)
  }
}

// 处理用户下拉菜单命令
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      await handleLogout()
      break
  }
}

// 退出登录处理
const handleLogout = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要退出登录吗？退出后将清除所有登录信息。',
      '退出登录确认',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (result === 'confirm') {
      await userStore.logout(true)
      ElMessage.success('已安全退出登录')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Logout error:', error)
      ElMessage.error('退出登录失败，但本地状态已清除')
      await userStore.logout(true)
    }
  }
}



// 初始化
onMounted(() => {
  userStore.initializeAuth()
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.logo-section {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #303133;
  transition: color 0.3s;
}

.logo-link:hover {
  color: #409eff;
}

.logo-icon {
  margin-right: 8px;
  color: #409eff;
}

.project-name {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.nav-menu {
  flex: 1;
  border-bottom: none;
  background-color: transparent;
  display: flex;
  justify-content: flex-end;
}

.nav-menu .el-menu-item {
  border-bottom: none;
  margin: 0 8px;
  padding: 0 16px;
  height: 60px;
  line-height: 60px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  vertical-align: middle;
}

.nav-menu .el-menu-item:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

.user-avatar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px !important;
  padding: 0 12px !important;
  height: 60px;
}

.nav-avatar {
  border: 2px solid #e4e7ed;
  transition: border-color 0.3s;
}

.nav-avatar:hover {
  border-color: #409eff;
}

.user-dropdown {
  margin-left: 20px;
  cursor: pointer;
  height: 60px;
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 60px;
  color: #303133;
  transition: color 0.3s;
  line-height: 1;
}

.user-info:hover {
  color: #409eff;
}

.username {
  margin: 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.dropdown-icon {
  font-size: 12px;
  transition: transform 0.3s;
}

.user-dropdown:hover .dropdown-icon {
  transform: rotate(180deg);
}



/* 我的图书下拉菜单样式 */
.my-books-submenu {
  border-bottom: none;
}

.my-books-submenu .el-sub-menu__title {
  border-bottom: none;
  margin: 0 8px;
  padding: 0 16px;
  height: 60px;
  line-height: 60px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  vertical-align: middle;
}

.my-books-submenu .el-sub-menu__title:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

.my-books-submenu .el-menu {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.my-books-submenu .el-menu-item {
  height: 40px;
  line-height: 40px;
  margin: 0;
  padding: 0 20px;
}

.my-books-submenu .el-menu-item:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

.app-main {
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
  padding: 0; /* 移除padding，让Chat组件完全控制自己的布局 */
  overflow: hidden; /* 防止主容器出现滚动条 */
}

.app-footer {
  background-color: #303133;
  color: #fff;
  text-align: center;
  padding: 20px;
  height: auto;
}

.footer-content p {
  margin: 5px 0;
}

.footer-desc {
  font-size: 14px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
  }
  
  .logo-section {
    margin-right: 20px;
  }
  
  .project-name {
    font-size: 16px;
  }
  
  .nav-menu .el-menu-item {
    margin: 0 4px;
    padding: 0 8px;
    font-size: 14px;
  }
  
  .user-avatar-item {
    min-width: 50px !important;
    padding: 0 8px !important;
  }
  
  .nav-avatar {
    width: 24px !important;
    height: 24px !important;
  }
  
  .app-main {
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 5px;
  }
  
  .logo-section {
    margin-right: 10px;
  }
  
  .project-name {
    font-size: 14px;
  }
  
  .nav-menu .el-menu-item {
    margin: 0 2px;
    padding: 0 6px;
    font-size: 12px;
  }
  
  .user-avatar-item {
    min-width: 40px !important;
    padding: 0 6px !important;
  }
  
  .nav-avatar {
    width: 20px !important;
    height: 20px !important;
  }
}
</style>