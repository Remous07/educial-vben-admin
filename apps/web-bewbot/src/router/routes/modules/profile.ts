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
];

export default routes;
