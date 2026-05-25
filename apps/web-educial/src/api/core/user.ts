import { requestClient } from '#/api/request';

/**
 * 获取当前登录用户信息
 * GET /sys/user/info
 * Returns: { code: 0, user: SysUserEntity }
 */
export async function getUserInfoApi() {
  return requestClient.get<any>('/sys/user/info');
}
