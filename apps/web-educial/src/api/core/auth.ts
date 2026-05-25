import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    code: number;
    expire: number;
    msg: string;
    token: string;
  }
}

/**
 * 登录
 * POST /sys/login
 * Body: { username, password }
 * Returns: { code: 0, msg: 'success', token: '...', expire: 604800 }
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/sys/login', data);
}

/**
 * 退出登录
 * POST /sys/logout
 */
export async function logoutApi() {
  return baseRequestClient.post('/sys/logout', {
    withCredentials: true,
  });
}
