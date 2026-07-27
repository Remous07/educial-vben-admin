import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    accessToken: string;
  }

  export interface RegisterParams {
    username: string;
    email: string;
    password: string;
  }

  export interface RegisterResult {
    message: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/** 登录 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/** 注册 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return requestClient.post<AuthApi.RegisterResult>('/auth/register', data);
}

/** 刷新 token */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/** 退出登录 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', {
    withCredentials: true,
  });
}

/** 获取用户权限码 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}

/** 忘记密码 — 发送重置邮件 */
export async function forgotPasswordApi(data: {
  email: string;
  turnstile_token?: string;
}) {
  return requestClient.post('/auth/forgot-password', data);
}

/** 重置密码 */
export async function resetPasswordApi(data: {
  new_password: string;
  token: string;
}) {
  return requestClient.post('/auth/reset-password', data);
}
