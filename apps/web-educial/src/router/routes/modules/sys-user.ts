import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/sys-user/index.vue'),
    meta: { icon: 'lucide:users', title: '系统用户' },
    name: 'SysUser',
    path: '/sys-user',
  },
];

export default routes;
