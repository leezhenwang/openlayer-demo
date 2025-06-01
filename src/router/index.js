import { createRouter, createWebHistory } from 'vue-router'
import LogisticsMap from '../components/LogisticsMap.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Map',
      component: LogisticsMap
    }
  ]
})

export default router