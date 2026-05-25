import { requestClient } from '#/api/request';

/**
 * 系统用户列表 (分页)
 * GET /sys/user/list
 */
export async function getSysUserListApi(params: Record<string, any>) {
  return requestClient.get('/sys/user/list', { params });
}

/**
 * 获取单个系统用户
 * GET /sys/user/info/{userId}
 */
export async function getSysUserApi(userId: number) {
  return requestClient.get(`/sys/user/info/${userId}`);
}

/**
 * 新增系统用户
 * POST /sys/user/save
 */
export async function createSysUserApi(data: any) {
  return requestClient.post('/sys/user/save', data);
}

/**
 * 修改系统用户
 * POST /sys/user/update
 */
export async function updateSysUserApi(data: any) {
  return requestClient.post('/sys/user/update', data);
}

/**
 * 删除系统用户
 * POST /sys/user/delete
 * body: Long[] userIds
 */
export async function deleteSysUserApi(userIds: number[]) {
  return requestClient.post('/sys/user/delete', userIds);
}
