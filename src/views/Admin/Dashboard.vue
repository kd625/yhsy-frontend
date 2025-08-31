<template>
  <div class="admin-dashboard-container">
    <el-card class="dashboard-card">
      <template #header>
        <div class="card-header">
          <h2>管理后台</h2>
        </div>
      </template>
      
      <div class="dashboard-content">
        <el-empty description="管理后台功能开发中..." />
        <router-view />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 管理员仪表板页面
</script>

<style scoped>
.admin-dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.dashboard-content {
  padding: 40px 20px;
  text-align: center;
}
</style>