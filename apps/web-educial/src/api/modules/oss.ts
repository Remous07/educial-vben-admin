import { requestClient } from '#/api/request';

export async function getOssConfigApi() {
  return requestClient.get('/sys/oss/config');
}

export async function saveOssConfigApi(data: any) {
  return requestClient.post('/sys/oss/saveConfig', data);
}

export async function getOssListApi(params: Record<string, any>) {
  return requestClient.get('/sys/oss/list', { params });
}

export async function deleteOssFileApi(ids: number[]) {
  return requestClient.post('/sys/oss/delete', ids);
}

export async function uploadOssFileApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post('/sys/oss/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
