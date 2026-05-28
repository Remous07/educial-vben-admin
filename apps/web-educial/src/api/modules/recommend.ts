import { requestClient } from '#/api/request';

export async function getRecommendListApi(params: Record<string, any>) {
  return requestClient.get('/admin/recommend/list', { params });
}

export async function getRecommendApi(id: number) {
  return requestClient.get(`/admin/recommend/info/${id}`);
}

export async function createRecommendApi(data: any) {
  return requestClient.post('/admin/recommend/save', data);
}

export async function updateRecommendApi(data: any) {
  return requestClient.post('/admin/recommend/update', data);
}

export async function deleteRecommendApi(ids: number[]) {
  return requestClient.post('/admin/recommend/delete', ids);
}

export async function upRecommendApi(ids: number[]) {
  return requestClient.post('/admin/recommend/up', ids);
}

export async function downRecommendApi(ids: number[]) {
  return requestClient.post('/admin/recommend/down', ids);
}
