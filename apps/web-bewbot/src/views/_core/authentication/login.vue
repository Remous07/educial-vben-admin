<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton, VbenCheckbox } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const router = useRouter();
const turnstileToken = ref('');
const rememberMe = ref(false);

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const [Form, formApi] = useVbenForm({
  commonConfig: { hideLabel: true, hideRequiredMark: true },
  schema: [
    {
      component: 'VbenInput',
      componentProps: { placeholder: '邮箱或用户名' },
      fieldName: 'username',
      rules: z.string().min(1, { message: '请输入邮箱或用户名' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: $t('authentication.password') },
      fieldName: 'password',
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ],
  showDefaultActions: false,
});

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) return;

  if (siteKey && !turnstileToken.value) {
    message.warning('请完成人机验证');
    return;
  }

  const values = await formApi.getValues();
  await authStore.authLogin({
    ...values,
    turnstile_token: turnstileToken.value || undefined,
  });
  turnstileToken.value = '';
}
</script>

<template>
  <div class="p-6" @keydown.enter.prevent="handleSubmit">
    <div class="mb-4 text-center">
      <h2 class="text-xl font-semibold">
        {{ $t('authentication.welcomeBack') }} 👋🏻
      </h2>
      <p class="mt-1 text-sm text-gray-500">登录您的账户</p>
    </div>

    <Form />

    <div class="mb-6 flex justify-between">
      <VbenCheckbox v-model="rememberMe">
        {{ $t('authentication.rememberMe') }}
      </VbenCheckbox>
      <a
        class="cursor-pointer text-sm text-blue-500"
        @click="router.push('/auth/forget-password')"
      >
        {{ $t('authentication.forgetPassword') }}
      </a>
    </div>

    <div v-if="siteKey" class="mb-4 flex justify-center">
      <TurnstileWidget
        :site-key="siteKey"
        @verified="(t: string) => (turnstileToken = t)"
        @expired="turnstileToken = ''"
        @error="turnstileToken = ''"
      />
    </div>

    <VbenButton
      :loading="authStore.loginLoading"
      class="w-full"
      @click="handleSubmit"
    >
      {{ $t('common.login') }}
    </VbenButton>

    <div class="mt-4 text-center text-sm">
      <span class="text-gray-400">还没有账号？</span>
      <a
        class="cursor-pointer text-blue-500"
        @click="router.push('/auth/register')"
      >
        注册
      </a>
    </div>
  </div>
</template>
