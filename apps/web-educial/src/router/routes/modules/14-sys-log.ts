import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/sys-log/index.vue'),
    meta: { icon: 'lucide:file-text', title: '操作日志' },
    name: 'SysLog',
    path: '/sys-log',
  },
];

export default routes;
