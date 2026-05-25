import { requestClient } from '#/api/request';

export async function getCategoryListApi(params: Record<string, any>) {
  return requestClient.get('/admin/category/list', { params });
}

export async function getCategoryApi(id: number) {
  return requestClient.get(`/admin/category/info/${id}`);
}

export async function createCategoryApi(data: any) {
  return requestClient.post('/admin/category/save', data);
}

export async function updateCategoryApi(data: any) {
  return requestClient.post('/admin/category/update', data);
}

export async function deleteCategoryApi(ids: number[]) {
  return requestClient.post('/admin/category/delete', ids);
}
