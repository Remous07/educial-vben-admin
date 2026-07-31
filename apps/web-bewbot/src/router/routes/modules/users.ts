import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/users/index.vue'),
    meta: {
      authority: ['superadmin', 'operator'],
      icon: 'lucide:users',
      title: 'TG用户',
      order: 20,
    },
    name: 'Users',
    path: '/users',
  },
];

export default routes;
