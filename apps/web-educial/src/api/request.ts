import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  async function doReAuthenticate() {
    console.warn('Access token is invalid or expired.');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout(false);
    }
  }

  async function doRefreshToken() {
    // Educial backend uses permanent tokens (7-day expiry), no refresh flow.
    // If token expires, redirect to login page.
    doReAuthenticate();
    return '';
  }

  function formatToken(token: null | string) {
    // Educial backend reads token from request header (OAuth2Filter)
    return token || null;
  }

  // Request interceptor: add token to header
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      config.headers.token = accessStore.accessToken || '';
      return config;
    },
  });

  // Response interceptor: strip code/msg, return remaining data.
  // Error responses (code !== 0) will throw, triggering errorMessageResponseInterceptor.
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: (response: any) => {
        const { code: _code, msg: _msg, ...rest } = response;
        return rest;
      },
      successCode: 0,
    }),
  );

  // Token expiration handling
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: false,
      formatToken,
    }),
  );

  // Generic error handling, including token expiration
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.msg ?? responseData?.message ?? '';

      // Check for token expiration (backend returns code 401 in body)
      if (responseData?.code === 401 || errorMessage?.includes('token')) {
        message.error(errorMessage || msg);
        doReAuthenticate();
        return;
      }

      message.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
