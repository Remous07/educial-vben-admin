import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/system/admin-users/index.vue'),
    meta: {
      authority: ['superadmin', 'operator'],
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
  {
    component: () => import('#/views/system/invite-codes/index.vue'),
    meta: {
      authority: ['superadmin'],
      icon: 'lucide:user-plus',
      title: '注册设置',
      order: 93,
    },
    name: 'InviteCodes',
    path: '/system/invite-codes',
  },
  {
    component: () => import('#/views/system/audit-logs/index.vue'),
    meta: {
      authority: ['superadmin'],
      icon: 'lucide:scroll-text',
      title: '日志审计',
      order: 94,
    },
    name: 'AuditLogs',
    path: '/system/audit-logs',
  },
];

export default routes;
