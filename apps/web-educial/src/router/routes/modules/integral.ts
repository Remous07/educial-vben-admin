import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/integral/index.vue'),
    meta: { icon: 'lucide:coins', title: '积分管理' },
    name: 'IntegralManage',
    path: '/integral',
  },
];

export default routes;
