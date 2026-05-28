<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const turnstileKey = ref(0);
const turnstileToken = ref('');

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});

function onTurnstileVerify(token: string) {
  turnstileToken.value = token;
}

async function handleLogin(values: Record<string, any>) {
  if (!turnstileToken.value) {
    message.warning('请完成人机验证');
    return;
  }
  try {
    await authStore.authLogin({
      ...values,
      turnstileToken: turnstileToken.value,
    });
  } catch {
    turnstileToken.value = '';
    turnstileKey.value++;
  }
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    login-button-text="登录"
    @submit="handleLogin"
  >
    <template #turnstile>
      <div class="mb-6 flex w-full justify-center">
        <TurnstileWidget
          :key="turnstileKey"
          @update:model-value="onTurnstileVerify"
        />
      </div>
    </template>
  </AuthenticationLogin>
</template>
