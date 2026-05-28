import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/schedule-job/index.vue'),
    meta: { icon: 'lucide:timer', title: '定时任务' },
    name: 'ScheduleJobManage',
    path: '/schedule-job',
  },
];

export default routes;
