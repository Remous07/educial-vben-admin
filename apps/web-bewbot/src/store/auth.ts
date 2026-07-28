import type { Recordable, UserInfo } from '@vben/types';

import type { AuthApi } from '#/api';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  getAccessCodesApi,
  getUserInfoApi,
  loginApi,
  loginTotpApi,
  logoutApi,
  registerApi,
} from '#/api';
import { $t } from '#/locales';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const registerLoading = ref(false);
  const totpTempToken = ref('');

  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const response: any = await loginApi(params);

      // TOTP required: store temp token, redirect to TOTP page
      if (response.totpPending) {
        totpTempToken.value = response.tempToken;
        await router.push('/auth/totp-verify');
        return { userInfo: null };
      }

      const { accessToken } = response;

      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        const [fetchUserInfoResult, accessCodes] = await Promise.all([
          fetchUserInfo(),
          getAccessCodesApi(),
        ]);

        userInfo = fetchUserInfoResult;
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo.homePath || preferences.app.defaultHomePath,
              );
        }

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? { redirect: encodeURIComponent(router.currentRoute.value.fullPath) }
        : {},
    });
  }

  async function fetchUserInfo() {
    const userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  async function authRegister(params: Recordable<any>) {
    try {
      registerLoading.value = true;
      await registerApi(params as AuthApi.RegisterParams);
    } finally {
      registerLoading.value = false;
    }
  }

  function $reset() {
    loginLoading.value = false;
    registerLoading.value = false;
  }

  async function authLoginTotp(totpCode: string) {
    try {
      loginLoading.value = true;
      const { accessToken } = await loginTotpApi(totpTempToken.value, totpCode);

      if (accessToken) {
        accessStore.setAccessToken(accessToken);
        totpTempToken.value = '';

        const [fetchUserInfoResult, accessCodes] = await Promise.all([
          fetchUserInfo(),
          getAccessCodesApi(),
        ]);

        const userInfo = fetchUserInfoResult;
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(accessCodes);

        await router.push(userInfo.homePath || preferences.app.defaultHomePath);

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }
  }

  return {
    $reset,
    authLogin,
    authLoginTotp,
    authRegister,
    fetchUserInfo,
    loginLoading,
    logout,
    registerLoading,
    totpTempToken,
  };
});
