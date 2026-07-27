<script lang="ts" setup>
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

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const [Form, formApi] = useVbenForm({
  commonConfig: { hideLabel: true, hideRequiredMark: true },
  schema: [
    {
      component: 'VbenInput',
      componentProps: { placeholder: '3-10位，字母/数字/下划线/连字符' },
      fieldName: 'username',
      label: '用户名',
      rules: z
        .string()
        .min(3, { message: '用户名至少 3 个字符' })
        .max(10, { message: '用户名最多 10 个字符' })
        .regex(/^[a-zA-Z0-9_-]+$/, {
          message: '仅允许字母、数字、下划线和连字符',
        }),
    },
    {
      component: 'VbenInput',
      componentProps: { placeholder: 'your@email.com', type: 'email' },
      fieldName: 'email',
      label: '邮箱',
      rules: z.string().email({ message: '请输入有效的邮箱地址' }),
    },
    {
      component: 'VbenInput',
      componentProps: { placeholder: '请输入邀请码（如已开启）' },
      fieldName: 'invite_code',
      label: '邀请码',
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: $t('authentication.password') },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(6, { message: '密码至少 6 个字符' }).max(128),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请再次输入密码' },
      fieldName: 'confirmPassword',
      label: '确认密码',
      dependencies: {
        rules(values) {
          const { password } = values;
          return z.string().refine((v) => v === password, {
            message: '两次输入的密码不一致',
          });
        },
        triggerFields: ['password'],
      },
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
    email: values.email,
    invite_code: values.invite_code,
    password: values.password,
    username: values.username,
    turnstile_token: turnstileToken.value || undefined,
  });
  turnstileToken.value = '';
}
</script>

<template>
  <div class="p-6">
    <div class="mb-4 text-center">
      <h2 class="text-xl font-semibold">创建账户 🚀</h2>
      <p class="mt-1 text-sm text-gray-500">注册新的管理账户</p>
    </div>

    <Form />

    <div v-if="siteKey" class="mb-4 flex justify-center">
      <TurnstileWidget
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
</template>
