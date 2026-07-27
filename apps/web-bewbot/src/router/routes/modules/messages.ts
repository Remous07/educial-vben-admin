import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/messages/index.vue'),
    meta: {
      icon: 'lucide:message-square',
      title: '消息记录',
      order: 30,
    },
    name: 'Messages',
    path: '/messages',
  },
];

export default routes;
