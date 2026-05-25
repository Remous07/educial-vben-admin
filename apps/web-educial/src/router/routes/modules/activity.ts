import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/activity/index.vue'),
    meta: { icon: 'lucide:calendar', title: '活动管理' },
    name: 'ActivityManage',
    path: '/activity',
  },
];

export default routes;
