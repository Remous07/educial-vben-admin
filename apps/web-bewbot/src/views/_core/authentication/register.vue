<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import { getRegistrationStatusApi } from '#/api/core';
import { requestClient } from '#/api/request';
import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Register' });

const authStore = useAuthStore();
const router = useRouter();
const turnstileToken = ref('');
const checkingAccess = ref(true);

onMounted(async () => {
  try {
    const res = await getRegistrationStatusApi();
    if (res && !res.data.open_registration) {
      message.warning('注册已关闭');
      router.replace('/auth/login');
      return;
    }
  } catch {
    // If the check fails, allow access (safe default)
  }
  checkingAccess.value = false;
});
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const registered = ref(false);
const registeredEmail = ref('');
const resending = ref(false);

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
  registeredEmail.value = values.email;
  registered.value = true;
  turnstileToken.value = '';
}

async function handleResendVerification() {
  resending.value = true;
  try {
    await requestClient.post('/auth/resend-verification', {
      email: registeredEmail.value,
    });
    message.success('验证邮件已重新发送');
  } catch {
    // error handled by interceptor
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <div v-if="!checkingAccess" class="p-6">
    <!-- Pre-registration form -->
    <template v-if="!registered">
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
    </template>

    <!-- Post-registration: verification pending -->
    <template v-else>
      <div class="text-center">
        <h2 class="mb-2 text-xl font-semibold">注册成功 ✅</h2>
        <p class="text-sm text-gray-500">
          验证邮件已发送至
          <span class="font-medium text-gray-700">{{ registeredEmail }}</span>
        </p>
        <p class="mt-1 text-sm text-gray-400">请查收邮件并点击链接完成验证</p>
      </div>

      <div class="mt-6 space-y-3">
        <VbenButton
          :loading="resending"
          class="w-full"
          variant="outline"
          @click="handleResendVerification"
        >
          重新发送验证邮件
        </VbenButton>

        <VbenButton class="w-full" @click="router.push('/auth/login')">
          前往登录
        </VbenButton>
      </div>
    </template>
  </div>
</template>
