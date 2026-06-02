import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/sys-role/index.vue'),
    meta: { icon: 'lucide:shield', title: '系统角色' },
    name: 'SysRole',
    path: '/sys-role',
  },
];

export default routes;
