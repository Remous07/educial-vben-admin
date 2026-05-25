import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/comment/index.vue'),
    meta: { icon: 'lucide:message-square', title: '评论管理' },
    name: 'CommentManage',
    path: '/comment',
  },
];

export default routes;
