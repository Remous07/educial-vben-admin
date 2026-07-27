<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  Descriptions,
  Input,
  message,
  Modal,
  QRCode,
  Result,
  Spin,
} from 'ant-design-vue';

import {
  changePasswordApi,
  getTotpStatusApi,
  totpDisableApi,
  totpEnableApi,
  totpSetupApi,
} from '#/api/core';

defineOptions({ name: 'Profile' });

const userStore = useUserStore();
const userInfo = userStore.userInfo;
const loading = ref(false);

// Change password
const passwordVisible = ref(false);
const currentPwd = ref('');
const newPwd = ref('');
const savingPwd = ref(false);

async function handleChangePassword() {
  savingPwd.value = true;
  try {
    await changePasswordApi(currentPwd.value, newPwd.value);
    message.success('密码已修改');
    passwordVisible.value = false;
    currentPwd.value = '';
    newPwd.value = '';
  } catch {
    message.error('修改失败');
  } finally {
    savingPwd.value = false;
  }
}

// TOTP
const totpEnabled = ref(false);
const totpVisible = ref(false);
const disableVisible = ref(false);
const setupData = ref<{ secret: string; uri: string } | null>(null);
const totpCode = ref('');
const savingTotp = ref(false);

async function fetchTotpStatus() {
  const result = await getTotpStatusApi();
  totpEnabled.value = result.enabled;
}

async function handleTotpSetup() {
  const result = await totpSetupApi();
  setupData.value = result;
  totpCode.value = '';
  totpVisible.value = true;
}

async function handleTotpEnable() {
  savingTotp.value = true;
  try {
    await totpEnableApi(totpCode.value);
    message.success('TOTP 已启用');
    totpVisible.value = false;
    totpEnabled.value = true;
  } catch {
    message.error('验证码错误');
  } finally {
    savingTotp.value = false;
  }
}

function openDisable() {
  totpCode.value = '';
  disableVisible.value = true;
}

async function handleTotpDisable() {
  savingTotp.value = true;
  try {
    await totpDisableApi(totpCode.value);
    message.success('TOTP 已关闭');
    disableVisible.value = false;
    totpEnabled.value = false;
  } catch {
    message.error('验证码错误');
  } finally {
    savingTotp.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  await fetchTotpStatus();
  loading.value = false;
});
</script>

<template>
  <Page>
    <Spin :spinning="loading">
      <Card title="账户信息" style="margin-bottom: 16px">
        <Descriptions :column="1">
          <Descriptions.Item label="用户名">
            {{ userInfo?.username }}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {{ userInfo?.email || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {{ userInfo?.created_at
              ? new Date(userInfo.created_at).toLocaleString('zh-CN')
              : '-' }}
          </Descriptions.Item>
        </Descriptions>
        <Button style="margin-top: 12px" @click="passwordVisible = true">
          修改密码
        </Button>
      </Card>

      <Card title="两步验证">
        <template v-if="totpEnabled">
          <Result
            status="success"
            title="已开启"
            sub-title="您的账户已受到两步验证保护"
          >
            <template #extra>
              <Button danger @click="openDisable">关闭两步验证</Button>
            </template>
          </Result>
        </template>
        <template v-else>
          <Result
            status="info"
            title="未开启"
            sub-title="开启后将使用身份验证器保护您的账户"
          >
            <template #extra>
              <Button type="primary" @click="handleTotpSetup">
                开启两步验证
              </Button>
            </template>
          </Result>
        </template>
      </Card>
    </Spin>

    <!-- Change Password Modal -->
    <Modal
      v-model:open="passwordVisible"
      title="修改密码"
      @ok="handleChangePassword"
      :confirm-loading="savingPwd"
    >
      <div style="margin-bottom: 12px">
        <label>当前密码</label>
        <Input
          v-model:value="currentPwd"
          type="password"
          placeholder="请输入当前密码"
          style="margin-top: 4px"
        />
      </div>
      <div>
        <label>新密码</label>
        <Input
          v-model:value="newPwd"
          type="password"
          placeholder="请输入新密码（至少6位）"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

    <!-- TOTP Setup Modal -->
    <Modal
      v-model:open="totpVisible"
      title="设置两步验证"
      :footer="null"
      width="400"
    >
      <div v-if="setupData" style="text-align: center">
        <p style="margin-bottom: 12px">
          请使用身份验证器扫描二维码
        </p>
        <div style="display: flex; justify-content: center; margin-bottom: 12px">
          <QRCode :value="setupData.uri" :size="200" />
        </div>
        <p style="margin-bottom: 12px; font-size: 12px; color: #888">
          密钥：<code>{{ setupData.secret }}</code>
        </p>
        <Input
          v-model:value="totpCode"
          placeholder="输入 6 位验证码"
          maxlength="6"
          style="margin-bottom: 12px"
        />
        <Button type="primary" block :loading="savingTotp" @click="handleTotpEnable">
          验证并启用
        </Button>
      </div>
    </Modal>

    <!-- TOTP Disable Modal -->
    <Modal
      v-model:open="disableVisible"
      title="关闭两步验证"
      @ok="handleTotpDisable"
      :confirm-loading="savingTotp"
    >
      <Input
        v-model:value="totpCode"
        placeholder="输入当前验证码以确认关闭"
        maxlength="6"
      />
    </Modal>
  </Page>
</template>
