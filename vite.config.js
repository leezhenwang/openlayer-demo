import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['pbf'],
    exclude: ['ol'] // 排除OpenLayers的优化
  }
})