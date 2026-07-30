import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/messages/index.vue'),
    meta: {
      icon: 'lucide:message-square',
      title: '我的访客',
      order: 30,
    },
    name: 'Messages',
    path: '/messages',
  },
];

export default routes;
