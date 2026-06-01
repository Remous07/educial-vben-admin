import { requestClient } from '#/api/request';

export async function getAppUserListApi(params: Record<string, any>) {
  return requestClient.get('/admin/user/list', { params });
}

export async function getAppUserApi(uid: number) {
  return requestClient.get(`/admin/user/info/${uid}`);
}

export async function updateAppUserApi(data: any) {
  return requestClient.post('/admin/user/update', data);
}

export async function banAppUserApi(id: number, reason?: string) {
  return requestClient.get(`/admin/user/ban/${id}`, { params: { reason } });
}

export async function batchBanAppUserApi(ids: number[], reason?: string) {
  return requestClient.post('/admin/user/ban', ids, { params: { reason } });
}

export async function unbanAppUserApi(id: number) {
  return requestClient.get(`/admin/user/openBan/${id}`);
}

export async function batchUnbanAppUserApi(ids: number[]) {
  return requestClient.post('/admin/user/openBan', ids);
}

export async function deleteAppUserApi(ids: number[]) {
  return requestClient.post('/admin/user/delete', ids);
}
