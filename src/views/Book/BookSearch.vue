<template>
  <div class="book-search-container">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <h2>搜索图书</h2>
        </div>
      </template>
      
      <div class="search-content">
        <el-empty description="图书搜索功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 图书搜索页面
</script>

<style scoped>
.book-search-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.search-content {
  padding: 40px 20px;
  text-align: center;
}
</style>