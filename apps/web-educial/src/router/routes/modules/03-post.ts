import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/post/index.vue'),
    meta: { icon: 'lucide:file-edit', title: '帖子管理' },
    name: 'PostManage',
    path: '/post',
  },
];

export default routes;
