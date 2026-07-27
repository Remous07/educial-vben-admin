import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/system/admin-users/index.vue'),
    meta: {
      authority: ['superadmin'],
      icon: 'lucide:shield',
      title: '系统用户',
      order: 91,
    },
    name: 'AdminUsers',
    path: '/system/admin-users',
  },
  {
    component: () => import('#/views/system/roles/index.vue'),
    meta: {
      authority: ['superadmin'],
      icon: 'lucide:user-cog',
      title: '系统角色',
      order: 92,
    },
    name: 'Roles',
    path: '/system/roles',
  },
];

export default routes;
