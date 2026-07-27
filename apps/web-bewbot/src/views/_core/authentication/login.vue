<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>();
const turnstileToken = ref('');

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '邮箱或用户名',
      },
      fieldName: 'username',
      label: '账号',
      rules: z.string().min(1, { message: '请输入邮箱或用户名' }),
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

async function handleSubmit(params: Recordable<any>) {
  // Only require Turnstile when site key is configured
  if (siteKey && !turnstileToken.value) {
    import('ant-design-vue').then(({ message }) => {
      message.warning('请完成人机验证');
    });
    return;
  }
  await authStore.authLogin({
    ...params,
    turnstile_token: turnstileToken.value || undefined,
  });
  // Reset for next attempt
  turnstileToken.value = '';
  turnstileRef.value?.reset();
}

function onTurnstileVerified(token: string) {
  turnstileToken.value = token;
}

function onTurnstileExpired() {
  turnstileToken.value = '';
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    login-title="Bewbot 管理面板"
    login-sub-title="登录您的账户"
    @submit="handleSubmit"
  >
    <template v-if="siteKey" #custom-form-items>
      <div class="flex justify-center">
        <TurnstileWidget
          ref="turnstileRef"
          :site-key="siteKey"
          @verified="onTurnstileVerified"
          @expired="onTurnstileExpired"
          @error="turnstileToken = ''"
        />
      </div>
    </template>
  </AuthenticationLogin>
</template>
