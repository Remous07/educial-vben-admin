import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/sys-menu/index.vue'),
    meta: { icon: 'lucide:menu', title: '系统菜单' },
    name: 'SysMenu',
    path: '/sys-menu',
  },
];

export default routes;
