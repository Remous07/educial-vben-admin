<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenForm, z } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({ name: 'TotpVerify' });

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);

const [Form, formApi] = useVbenForm({
  commonConfig: { hideLabel: true, hideRequiredMark: true },
  schema: [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入 6 位验证码',
        maxlength: 6,
      },
      fieldName: 'code',
      rules: z.string().length(6, { message: '请输入 6 位验证码' }),
    },
  ],
  showDefaultActions: false,
});

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) return;

  loading.value = true;
  try {
    const values = await formApi.getValues();
    await authStore.authLoginTotp(values.code);
  } catch {
    message.error('验证码错误');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex h-full items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <h2 class="text-xl font-semibold">两步验证</h2>
        <p class="mt-2 text-sm text-gray-500">
          请输入身份验证器中的 6 位验证码
        </p>
      </div>

      <Form />

      <VbenButton
        :loading="loading"
        class="w-full"
        @click="handleSubmit"
      >
        验证
      </VbenButton>

      <div class="mt-4 text-center text-sm">
        <a class="cursor-pointer text-blue-500" @click="router.push('/auth/login')">
          返回登录
        </a>
      </div>
    </div>
  </div>
</template>
