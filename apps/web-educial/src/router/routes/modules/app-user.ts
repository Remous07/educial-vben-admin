import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/app-user/index.vue'),
    meta: { icon: 'lucide:user-check', title: 'App用户管理' },
    name: 'AppUserManage',
    path: '/app-user',
  },
];

export default routes;
