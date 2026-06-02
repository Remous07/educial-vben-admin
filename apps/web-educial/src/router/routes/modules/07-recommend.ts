import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/recommend/index.vue'),
    meta: { icon: 'lucide:thumbs-up', title: '推荐管理' },
    name: 'RecommendManage',
    path: '/recommend',
  },
];

export default routes;
