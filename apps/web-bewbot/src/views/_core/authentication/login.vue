<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton, VbenCheckbox } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import { getRegistrationStatusApi } from '#/api/core';
import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const turnstileToken = ref('');
const registrationOpen = ref(true);

onMounted(async () => {
  try {
    const res = await getRegistrationStatusApi();
    if (res) {
      registrationOpen.value = res.data.data.open_registration;
    }
  } catch {
    // If the request fails, default to showing registration (safe default)
  }

  // Handle query params
  const q = route.query;
  if (q.verified === '1') {
    message.success('邮箱验证成功，请登录');
    router.replace({ query: {} });
  } else if (q.verified === 'already') {
    message.info('邮箱已通过验证，请登录');
    router.replace({ query: {} });
  } else if (q.verified === 'error') {
    message.error((q.msg as string) || '验证链接无效');
    router.replace({ query: {} });
  } else if (q.email_changed === '1') {
    message.success('邮箱已更新，请重新登录');
    router.replace({ query: {} });
  } else if (q.email_changed === 'error') {
    message.error((q.msg as string) || '邮箱修改失败');
    router.replace({ query: {} });
  }
});
const rememberMe = ref(false);

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const [Form, formApi] = useVbenForm({
  commonConfig: { hideLabel: true, hideRequiredMark: true },
  schema: [
    {
      component: 'VbenInput',
      componentProps: { placeholder: '邮箱或用户名 (3-10位)' },
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

    <div v-if="registrationOpen" class="mt-4 text-center text-sm">
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
