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
        
        <!-- 右侧导航菜单 -->
        <div class="nav-section">
          <el-menu
            mode="horizontal"
            :default-active="activeIndex"
            class="nav-menu"
            @select="handleSelect"
          >
            <!-- 公共菜单 -->
            <el-menu-item index="/">首页</el-menu-item>
            
            <!-- 登录后显示的菜单 -->
            <template v-if="userStore.isLogin">
              <el-menu-item index="/publish">发布图书</el-menu-item>
              <el-sub-menu index="user">
                <template #title>
                  <el-avatar :size="24" :src="userStore.userInfo?.userAvatar">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <span class="username">{{ userStore.userInfo?.userName }}</span>
                </template>
                <el-menu-item index="/profile">个人中心</el-menu-item>
                <el-menu-item index="/my-books">我的图书</el-menu-item>
                <el-menu-item v-if="userStore.isAdmin" index="/admin">管理后台</el-menu-item>
                <el-menu-item index="logout" @click="handleLogout">退出登录</el-menu-item>
              </el-sub-menu>
            </template>
            
            <!-- 未登录时显示的菜单 -->
            <template v-else>
              <el-menu-item index="/login">登录</el-menu-item>
              <el-menu-item index="/register">注册</el-menu-item>
            </template>
          </el-menu>
        </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Reading, User } from '@element-plus/icons-vue'
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

// 处理退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await userStore.logout()
    ElMessage.success('退出登录成功')
    router.push('/login')
  } catch (error) {
    // 用户取消操作或退出登录失败
    if (error !== 'cancel') {
      console.error('退出登录失败:', error)
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

.nav-section {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.nav-menu {
  border-bottom: none;
  background-color: transparent;
}

.nav-menu .el-menu-item {
  border-bottom: none;
}

.username {
  margin-left: 8px;
}

.app-main {
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
  padding: 20px;
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
  
  .project-name {
    font-size: 16px;
  }
  
  .app-main {
    padding: 10px;
  }
  
  .nav-menu {
    font-size: 14px;
  }
}
</style>