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
  getConversationCodeApi,
  getTelegramBindStatusApi,
  getTotpStatusApi,
  setConversationCodeApi,
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
const tgKey = ref('');
const tgLinking = ref(false);

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
  tgLinking.value = true;
  try {
    const r = await setupTelegramBindApi();
    tgKey.value = r.key;
  } finally {
    tgLinking.value = false;
  }
}

function copyBindCommand() {
  navigator.clipboard.writeText(`/bind ${tgKey.value}`);
  message.success('已复制');
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

// Conversation code
const convCode = ref('');
const convCodeEdit = ref(false);
const convCodeInput = ref('');
const convCodeSaving = ref(false);
const convCodeHelper = ref('');

async function fetchConvCode() {
  try {
    const r = await getConversationCodeApi();
    convCode.value = r.code;
  } catch {
    // ignore
  }
}

function openConvCodeEdit() {
  convCodeInput.value = convCode.value;
  convCodeHelper.value = '';
  convCodeEdit.value = true;
}

function copyConvCode() {
  navigator.clipboard.writeText(convCode.value);
  message.success('已复制');
}

async function handleSetConvCode() {
  if (!convCodeInput.value) {
    convCodeHelper.value = '识别码不能为空';
    return;
  }
  if (convCodeInput.value.length < 8 || convCodeInput.value.length > 16) {
    convCodeHelper.value = '识别码长度需为 8-16 位';
    return;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(convCodeInput.value)) {
    convCodeHelper.value = '仅允许字母、数字、-、_';
    return;
  }
  convCodeSaving.value = true;
  try {
    const r = await setConversationCodeApi(convCodeInput.value);
    convCode.value = r.code;
    convCodeEdit.value = false;
    message.success('识别码已更新');
  } catch (error: any) {
    convCodeHelper.value = error?.response?.data?.message || '设置失败';
  } finally {
    convCodeSaving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  await Promise.all([fetchTotpStatus(), fetchTgStatus(), fetchConvCode()]);
  loading.value = false;
});
</script>

<template>
  <Page>
    <Spin :spinning="loading">
      <div style="max-width: 420px">
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
            <Descriptions.Item label="对话识别码">
              <template v-if="convCodeEdit">
                <Input
                  v-model:value="convCodeInput"
                  placeholder="8-16位字母、数字、-、_"
                  :maxlength="16"
                  size="small"
                  style="width: 180px; margin-right: 8px"
                />
                <Button
                  size="small"
                  type="primary"
                  :loading="convCodeSaving"
                  @click="handleSetConvCode"
                >
                  保存
                </Button>
                <Button
                  size="small"
                  style="margin-left: 4px"
                  @click="convCodeEdit = false"
                >
                  取消
                </Button>
                <p
                  v-if="convCodeHelper"
                  style=" margin: 4px 0 0; font-size: 12px;color: #ff4d4f"
                >
                  {{ convCodeHelper }}
                </p>
              </template>
              <template v-else>
                <code style="font-size: 14px; font-weight: bold">{{
                  convCode || '-'
                }}</code>
                <Button
                  size="small"
                  type="link"
                  style="margin-left: 8px"
                  @click="copyConvCode"
                >
                  复制
                </Button>
                <Button
                  size="small"
                  type="link"
                  style="margin-left: 4px"
                  @click="openConvCodeEdit"
                >
                  修改
                </Button>
              </template>
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
            <Button
              type="primary"
              :loading="tgLinking"
              @click="handleSetupBind"
            >
              生成绑定密钥
            </Button>
            <div v-if="tgKey" style="margin-top: 8px">
              <p style="font-size: 13px; color: #888">
                请在 Telegram 中使用 /bind 命令绑定：
              </p>
              <p style="margin-bottom: 4px">
                <code style="font-size: 16px; font-weight: bold">
                  /bind {{ tgKey }}
                </code>
              </p>
              <Button size="small" @click="copyBindCommand"> 复制指令 </Button>
            </div>
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
          :maxlength="6"
          style="margin-top: 4px"
        />
      </div>
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
          :maxlength="6"
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
        :maxlength="6"
      />
    </Modal>
  </Page>
</template>
