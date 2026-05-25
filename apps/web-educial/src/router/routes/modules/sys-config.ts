import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/sys-config/index.vue'),
    meta: { icon: 'lucide:settings', title: '系统配置' },
    name: 'SysConfig',
    path: '/sys-config',
  },
];

export default routes;
