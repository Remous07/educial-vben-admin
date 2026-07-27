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
  changeEmailApi,
  changePasswordApi,
  getTelegramBindStatusApi,
  getTotpStatusApi,
  setupTelegramBindApi,
  totpDisableApi,
  totpEnableApi,
  totpSetupApi,
  unbindTelegramApi,
} from '#/api/core';

defineOptions({ name: 'Profile' });

const userStore = useUserStore();
const userInfo = userStore.userInfo;
const loading = ref(false);

// Change email
const emailVisible = ref(false);
const emailCurrentPwd = ref('');
const newEmail = ref('');
const savingEmail = ref(false);

async function handleChangeEmail() {
  savingEmail.value = true;
  try {
    await changeEmailApi(emailCurrentPwd.value, newEmail.value);
    message.success('邮箱已修改');
    emailVisible.value = false;
    emailCurrentPwd.value = '';
    newEmail.value = '';
  } catch (error: any) {
    message.error(error?.response?.data?.message || '修改失败');
  } finally {
    savingEmail.value = false;
  }
}

// Change password
const passwordVisible = ref(false);
const currentPwd = ref('');
const newPwd = ref('');
const pwdTotpCode = ref('');
const savingPwd = ref(false);

function openChangePassword() {
  currentPwd.value = '';
  newPwd.value = '';
  pwdTotpCode.value = '';
  passwordVisible.value = true;
}

async function handleChangePassword() {
  savingPwd.value = true;
  try {
    await changePasswordApi(
      currentPwd.value,
      newPwd.value,
      pwdTotpCode.value || undefined,
    );
    message.success('密码已修改');
    passwordVisible.value = false;
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
const setupData = ref<null | { secret: string; uri: string }>(null);
const totpCode = ref('');
const savingTotp = ref(false);

// Telegram binding
const tgBound = ref(false);
const tgId = ref<null | number>(null);
const tgFirstName = ref<null | string>(null);
const tgUsername = ref<null | string>(null);
const tgLink = ref('');
const tgLinkVisible = ref(false);

async function fetchTgStatus() {
  try {
    const s = await getTelegramBindStatusApi();
    tgBound.value = s.bound;
    tgId.value = s.telegram_id;
    tgFirstName.value = s.telegram_first_name;
    tgUsername.value = s.telegram_username;
  } catch {
    // ignore
  }
}

async function handleSetupBind() {
  const r = await setupTelegramBindApi();
  tgLink.value = r.link;
  tgLinkVisible.value = true;
}

async function handleUnbind() {
  await unbindTelegramApi();
  message.success('已解绑');
  fetchTgStatus();
}

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
  await Promise.all([fetchTotpStatus(), fetchTgStatus()]);
  loading.value = false;
});
</script>

<template>
  <Page>
    <Spin :spinning="loading">
      <div style="max-width: 640px">
        <Card title="账户信息" style="margin-bottom: 16px">
          <Descriptions :column="1">
            <Descriptions.Item label="用户名">
              {{ userInfo?.username }}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {{ userInfo?.email || '-' }}
              <Button
                size="small"
                type="link"
                style="margin-left: 8px"
                @click="emailVisible = true"
              >
                修改
              </Button>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {{
                userInfo?.created_at
                  ? new Date(userInfo.created_at).toLocaleString('zh-CN')
                  : '-'
              }}
            </Descriptions.Item>
          </Descriptions>
          <Button style="margin-top: 12px" @click="openChangePassword">
            修改密码
          </Button>
        </Card>

        <Card title="Telegram 绑定" style="margin-bottom: 16px">
          <template v-if="tgBound">
            <Descriptions :column="1" style="margin-bottom: 8px">
              <Descriptions.Item label="TG 用户 ID">
                {{ tgId }}
              </Descriptions.Item>
              <Descriptions.Item label="名称">
                {{ tgFirstName }}
              </Descriptions.Item>
              <Descriptions.Item label="用户名">
                {{ tgUsername || '-' }}
              </Descriptions.Item>
            </Descriptions>
            <Button danger @click="handleUnbind">解绑</Button>
          </template>
          <template v-else>
            <p style="margin-bottom: 12px; color: #888">未绑定 Telegram 账号</p>
            <Button type="primary" @click="handleSetupBind">
              生成绑定链接
            </Button>
          </template>
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
      </div>
    </Spin>

    <!-- Change Email Modal -->
    <Modal
      v-model:open="emailVisible"
      title="修改邮箱"
      @ok="handleChangeEmail"
      :confirm-loading="savingEmail"
    >
      <div style="margin-bottom: 12px">
        <label>当前密码</label>
        <Input
          v-model:value="emailCurrentPwd"
          type="password"
          placeholder="请输入当前密码"
          style="margin-top: 4px"
        />
      </div>
      <div>
        <label>新邮箱</label>
        <Input
          v-model:value="newEmail"
          type="email"
          placeholder="请输入新邮箱"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

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
      <div v-if="totpEnabled" style="margin-top: 12px">
        <label>两步验证码</label>
        <Input
          v-model:value="pwdTotpCode"
          placeholder="请输入 6 位验证码"
          maxlength="6"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

    <!-- Telegram Bind Modal -->
    <Modal
      v-model:open="tgLinkVisible"
      title="绑定 Telegram"
      :footer="null"
      width="340"
    >
      <p style="margin-bottom: 12px; font-size: 13px">
        请点击下方链接或复制到 Telegram 中打开：
      </p>
      <p
        style="
          margin-bottom: 12px;
          font-size: 12px;
          word-break: break-all;
          color: #1677ff;
        "
      >
        <a :href="tgLink" target="_blank" style="color: #1677ff">
          {{ tgLink }}
        </a>
      </p>
      <p style="font-size: 12px; color: #888">链接有效期 5 分钟</p>
    </Modal>

    <!-- TOTP Setup Modal -->
    <Modal
      v-model:open="totpVisible"
      title="设置两步验证"
      :footer="null"
      width="360"
    >
      <div
        v-if="setupData"
        style="max-width: 320px; margin: 0 auto; text-align: center"
      >
        <p style="margin-bottom: 12px; font-size: 13px">
          请使用身份验证器扫描二维码
        </p>
        <div
          style="display: flex; justify-content: center; margin-bottom: 12px"
        >
          <QRCode :value="setupData.uri" :size="180" />
        </div>
        <p
          style="
            margin-bottom: 12px;
            font-size: 11px;
            color: #888;
            word-break: break-all;
          "
        >
          密钥：<code>{{ setupData.secret }}</code>
        </p>
        <Input
          v-model:value="totpCode"
          placeholder="输入 6 位验证码"
          maxlength="6"
          style="margin-bottom: 12px"
        />
        <Button
          type="primary"
          block
          :loading="savingTotp"
          @click="handleTotpEnable"
        >
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
