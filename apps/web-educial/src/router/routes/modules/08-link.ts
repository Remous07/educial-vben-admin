import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/link/index.vue'),
    meta: { icon: 'lucide:image', title: '轮播图管理' },
    name: 'LinkManage',
    path: '/link',
  },
];

export default routes;
