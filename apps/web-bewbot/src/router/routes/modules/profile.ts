import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/account/profile/index.vue'),
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '个人中心',
    },
    name: 'Profile',
    path: '/profile',
  },
  {
    component: () => import('#/views/account/conversation-codes/index.vue'),
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '对话识别码管理',
    },
    name: 'ConversationCodes',
    path: '/conversation-codes',
  },
];

export default routes;
