import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/link/index.vue'),
    meta: { icon: 'lucide:link', title: '友链管理' },
    name: 'LinkManage',
    path: '/link',
  },
];

export default routes;
