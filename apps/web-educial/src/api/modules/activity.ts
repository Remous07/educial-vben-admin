import { requestClient } from '#/api/request';

export async function getActivityListApi(params: Record<string, any>) {
  return requestClient.get('/admin/activity/list', { params });
}

export async function getActivityApi(id: number) {
  return requestClient.get(`/admin/activity/info/${id}`);
}

export async function updateActivityApi(data: any) {
  return requestClient.post('/admin/activity/update', data);
}

export async function deleteActivityApi(ids: number[]) {
  return requestClient.post('/admin/activity/delete', ids);
}

export async function upActivityApi(ids: number[]) {
  return requestClient.post('/admin/activity/up', ids);
}

export async function downActivityApi(data: { ids: number[]; reason?: string }) {
  return requestClient.post('/admin/activity/down', data);
}
