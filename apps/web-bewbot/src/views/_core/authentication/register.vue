<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Register' });

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
      componentProps: { placeholder: '3-128 个字符' },
      fieldName: 'username',
      label: '用户名',
      rules: z.string().min(3).max(128),
    },
    {
      component: 'VbenInput',
      componentProps: { placeholder: 'your@email.com', type: 'email' },
      fieldName: 'email',
      label: '邮箱',
      rules: z.string().email(),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: $t('authentication.password') },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(6).max(128),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请再次输入密码' },
      fieldName: 'confirmPassword',
      label: '确认密码',
      rules: z.string().refine(
        (val) => {
          const values = formApi?.getValues() as Recordable<any> | undefined;
          return val === values?.password;
        },
        { message: '两次输入的密码不一致' },
      ),
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
  await authStore.authRegister({
    username: values.username,
    email: values.email,
    password: values.password,
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
        <h2 class="text-xl font-semibold">创建账户 🚀</h2>
        <p class="mt-2 text-sm text-gray-500">注册新的管理账户</p>
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
        :loading="authStore.registerLoading"
        class="w-full"
        @click="handleSubmit"
      >
        {{ $t('authentication.signUp') }}
      </VbenButton>

      <div class="mt-4 text-center text-sm">
        <span class="text-gray-400">已有账号？</span>
        <a
          class="cursor-pointer text-blue-500"
          @click="router.push('/auth/login')"
        >
          登录
        </a>
      </div>
    </div>
  </div>
</template>
