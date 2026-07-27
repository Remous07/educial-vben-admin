import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/users/index.vue'),
    meta: {
      icon: 'lucide:users',
      title: '用户管理',
      order: 20,
    },
    name: 'Users',
    path: '/users',
  },
];

export default routes;
