<template>
  <div class="my-books-container">
    <el-card class="my-books-card">
      <template #header>
        <div class="card-header">
          <h2>我的图书</h2>
        </div>
      </template>
      
      <div class="my-books-content">
        <el-empty description="我的图书功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 我的图书页面
</script>

<style scoped>
.my-books-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.my-books-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.my-books-content {
  padding: 40px 20px;
  text-align: center;
}
</style>