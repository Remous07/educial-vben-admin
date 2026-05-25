import { requestClient } from '#/api/request';

export async function getHomeStatisticsApi() {
  return requestClient.get('/admin/statistics/home');
}
