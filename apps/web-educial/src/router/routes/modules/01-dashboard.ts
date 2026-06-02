import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      icon: 'lucide:layout-dashboard',
      title: '总览',
    },
    name: 'Dashboard',
    path: '/dashboard',
  },
];

export default routes;
