<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, ref } from 'vue';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import TurnstileWidget from '#/components/TurnstileWidget.vue';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Register' });

const authStore = useAuthStore();
const turnstileToken = ref('');

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const formSchema = computed((): VbenFormSchema[] => [
  {
    component: 'VbenInput',
    componentProps: { placeholder: '3-128 个字符' },
    fieldName: 'username',
    label: '用户名',
    rules: z.string().min(3, { message: '用户名至少 3 个字符' }).max(128),
  },
  {
    component: 'VbenInput',
    componentProps: { placeholder: 'your@email.com', type: 'email' },
    fieldName: 'email',
    label: '邮箱',
    rules: z.string().email({ message: '请输入有效的邮箱地址' }),
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
        return z
          .string()
          .min(1)
          .refine((v) => v === password, {
            message: '两次输入的密码不一致',
          });
      },
      triggerFields: ['password'],
    },
  },
]);

async function handleSubmit(values: Recordable<any>) {
  if (siteKey && !turnstileToken.value) {
    const { message } = await import('ant-design-vue');
    message.warning('请完成人机验证');
    return;
  }
  await authStore.authRegister({
    username: values.username,
    email: values.email,
    password: values.password,
    turnstile_token: turnstileToken.value || undefined,
  });
  turnstileToken.value = '';
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="authStore.registerLoading"
    @submit="handleSubmit"
  >
    <template v-if="siteKey" #submitButtonText>
      <div class="mb-4 flex justify-center">
        <TurnstileWidget
          :site-key="siteKey"
          @verified="(t: string) => (turnstileToken = t)"
          @expired="turnstileToken = ''"
          @error="turnstileToken = ''"
        />
      </div>
      {{ $t('authentication.signUp') }}
    </template>
  </AuthenticationRegister>
</template>
