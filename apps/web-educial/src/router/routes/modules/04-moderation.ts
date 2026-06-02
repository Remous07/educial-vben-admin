import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/moderation/index.vue'),
    meta: { icon: 'lucide:shield-check', title: '审核管理' },
    name: 'ModerationManage',
    path: '/moderation',
  },
];

export default routes;
