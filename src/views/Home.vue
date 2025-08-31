<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="hero-title">欢迎来到砚湖书影</h1>
      <p class="hero-subtitle">让知识在这里流转，让书香在此传递</p>
      <div class="hero-actions">
        <el-button type="primary" size="large" @click="$router.push('/search')">
          <el-icon><Search /></el-icon>
          搜索图书
        </el-button>
        <el-button size="large" @click="$router.push('/publish')" v-if="userStore.isLogin">
          <el-icon><Plus /></el-icon>
          发布图书
        </el-button>
      </div>
    </div>
    
    <div class="content-section">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card class="welcome-card">
            <h2>最新图书</h2>
            <p>这里将显示最新发布的图书信息...</p>
            <el-empty description="暂无图书数据" />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-section {
  text-align: center;
  padding: 60px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 40px;
  color: white;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 32px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.content-section {
  margin-bottom: 40px;
}

.welcome-card {
  text-align: center;
  padding: 20px;
}

.welcome-card h2 {
  color: #303133;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>