import { requestClient } from '#/api/request';

export async function getLinkListApi(params: Record<string, any>) {
  return requestClient.get('/admin/link/list', { params });
}

export async function getLinkApi(id: number) {
  return requestClient.get(`/admin/link/info/${id}`);
}

export async function createLinkApi(data: any) {
  return requestClient.post('/admin/link/save', data);
}

export async function updateLinkApi(data: any) {
  return requestClient.post('/admin/link/update', data);
}

export async function deleteLinkApi(ids: number[]) {
  return requestClient.post('/admin/link/delete', ids);
}
