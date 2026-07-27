<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const router = useRouter();
const turnstileToken = ref('');
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>();

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
  turnstileRef.value?.reset();
}
</script>

<template>
  <div class="flex h-full items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <h2 class="text-xl font-semibold">Bewbot 管理面板</h2>
        <p class="mt-2 text-sm text-gray-500">登录您的账户</p>
      </div>

      <Form />

      <div v-if="siteKey" class="mb-4 flex justify-center">
        <TurnstileWidget
          ref="turnstileRef"
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
  </div>
</template>
