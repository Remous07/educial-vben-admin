<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { AvailableRoleItem, InviteCodeItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  AutoComplete,
  Button,
  DatePicker,
  Drawer,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createInviteCodeApi,
  deleteInviteCodeApi,
  editInviteCodeApi,
  fetchAiModelsApi,
  getAvailableRolesApi,
  getInviteCodesApi,
  getSystemSettingsBatchApi,
  getUsersByInviteCodeApi,
  permanentlyDeleteInviteCodeApi,
  reactivateInviteCodeApi,
  setSystemSettingApi,
} from '#/api/core';

defineOptions({ name: 'InviteCodes' });

const codes = ref<InviteCodeItem[]>([]);
const loading = ref(false);
const inviteRequired = ref(false);
const openRegistration = ref(true);
const emailDomainMode = ref<string>('off');
const emailDomainWhitelist = ref('');
const emailDomainBlacklist = ref('');

// ── email domain modal ──

const emailDomainModalVisible = ref(false);
const emailDomainModalMode = ref<string>('off');
const emailDomainModalList = ref('');

function _domainListForMode(mode: string): string {
  return mode === 'whitelist'
    ? emailDomainWhitelist.value
    : emailDomainBlacklist.value;
}

function openEmailDomainModal() {
  emailDomainModalMode.value = emailDomainMode.value;
  emailDomainModalList.value = _domainListForMode(emailDomainMode.value)
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .join('\n');
  emailDomainModalVisible.value = true;
}

function onEmailDomainModeChange() {
  // Switch to the saved list for the newly selected mode
  emailDomainModalList.value = _domainListForMode(emailDomainModalMode.value)
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .join('\n');
}

async function saveEmailDomainSettings() {
  const normalized = emailDomainModalList.value
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)
    .join(',');

  await setSystemSettingApi('email_domain_mode', emailDomainModalMode.value);
  // Save to mode-specific key
  const listKey =
    emailDomainModalMode.value === 'whitelist'
      ? 'email_domain_whitelist'
      : 'email_domain_blacklist';
  await setSystemSettingApi(listKey, normalized);

  emailDomainMode.value = emailDomainModalMode.value;
  if (emailDomainModalMode.value === 'whitelist') {
    emailDomainWhitelist.value = normalized;
  } else {
    emailDomainBlacklist.value = normalized;
  }
  emailDomainModalVisible.value = false;
  message.success('已更新邮箱域名过滤');
}

// Code users drawer
const userDrawerVisible = ref(false);
const userDrawerCode = ref('');
const userDrawerItems = ref<
  { created_at: null | string; email: string; id: number; username: string }[]
>([]);
const userDrawerLoading = ref(false);

async function showCodeUsers(code: InviteCodeItem) {
  userDrawerCode.value = code.code;
  userDrawerVisible.value = true;
  userDrawerLoading.value = true;
  try {
    userDrawerItems.value = await getUsersByInviteCodeApi(code.id);
  } finally {
    userDrawerLoading.value = false;
  }
}

async function toggleInviteRequired(val: boolean) {
  try {
    await setSystemSettingApi('require_invite_code', String(val));
    inviteRequired.value = val;
    message.success(val ? '已开启邀请码验证' : '已关闭邀请码验证');
  } catch {
    inviteRequired.value = !val;
  }
}

async function toggleOpenRegistration(val: boolean) {
  try {
    await setSystemSettingApi('open_registration', String(val));
    openRegistration.value = val;
    message.success(val ? '已开放注册' : '已关闭注册');
  } catch {
    openRegistration.value = !val;
  }
}

// ── roles ──

const availableRoles = ref<AvailableRoleItem[]>([]);
const fallbackRoleId = ref<number | undefined>(undefined);

async function handleFallbackRoleChange(val: any) {
  if (val === undefined || val === null) return;
  try {
    await setSystemSettingApi('default_registration_role', String(val));
    fallbackRoleId.value = val;
    message.success('已更新降级注册角色');
  } catch {
    // revert on failure
    fallbackRoleId.value = undefined;
  }
}

// ── username audit modal ──

const auditModalVisible = ref(false);
const auditEnabled = ref(false);
const auditBaseUrl = ref('');
const auditModel = ref('');
const auditApiKey = ref('');
const auditPrompt = ref('');
const auditFailOpen = ref(true);
const auditModelOptions = ref<{ label: string; value: string }[]>([]);
const fetchingModels = ref(false);

async function handleFetchModels() {
  if (!auditBaseUrl.value || !auditApiKey.value) {
    message.warning('请先填写 API 地址和 API Key');
    return;
  }
  fetchingModels.value = true;
  try {
    const models = await fetchAiModelsApi(
      auditBaseUrl.value,
      auditApiKey.value,
    );
    auditModelOptions.value = models.map((m) => ({ label: m, value: m }));
    message.success(`获取到 ${models.length} 个模型`);
  } catch {
    message.error('获取模型列表失败，请检查地址和 Key');
  } finally {
    fetchingModels.value = false;
  }
}

function openAuditModal() {
  auditEnabled.value = auditSettings.value.enabled === 'true';
  auditBaseUrl.value = auditSettings.value.base_url || '';
  auditModel.value = auditSettings.value.model || '';
  auditApiKey.value = auditSettings.value.api_key || '';
  auditPrompt.value = auditSettings.value.prompt || '';
  auditFailOpen.value = auditSettings.value.fail_open !== 'false';
  auditModalVisible.value = true;
}

async function saveAuditSettings() {
  await Promise.all([
    setSystemSettingApi('username_audit_enabled', String(auditEnabled.value)),
    setSystemSettingApi('username_audit_base_url', auditBaseUrl.value),
    setSystemSettingApi('username_audit_model', auditModel.value),
    setSystemSettingApi('username_audit_api_key', auditApiKey.value),
    setSystemSettingApi('username_audit_prompt', auditPrompt.value),
    setSystemSettingApi(
      'username_audit_fail_open',
      String(auditFailOpen.value),
    ),
  ]);
  auditSettings.value.enabled = String(auditEnabled.value);
  auditSettings.value.base_url = auditBaseUrl.value;
  auditSettings.value.model = auditModel.value;
  auditSettings.value.api_key = auditApiKey.value;
  auditSettings.value.prompt = auditPrompt.value;
  auditSettings.value.fail_open = String(auditFailOpen.value);
  auditModalVisible.value = false;
  message.success('已更新用户名审核设置');
}

const auditSettings = ref<Record<string, string>>({});

// ── create modal ──

const modalVisible = ref(false);
const defaultRoleId = ref<number | undefined>(undefined);
const maxUses = ref(1);
const expiresAt = ref<any>(dayjs().add(7, 'day'));
const expiresDays = ref(7);
const remark = ref('');
const saving = ref(false);

function onExpiresAtChange(d: any) {
  expiresDays.value = d
    ? Math.max(0, Math.round(d.diff(dayjs(), 'day', true)))
    : 0;
}
function onExpiresDaysChange() {
  expiresAt.value =
    expiresDays.value > 0 ? dayjs().add(expiresDays.value, 'day') : null;
}

const columns: TableColumnsType = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 60,
    sorter: (a: InviteCodeItem, b: InviteCodeItem) => a.id - b.id,
    sortDirections: ['ascend', 'descend'],
  },
  { title: '邀请码', dataIndex: 'code', key: 'code', width: 180 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    customRender: ({ record }: { record: InviteCodeItem }) => {
      if (!record.is_active) return h(Tag, { color: 'red' }, () => '已撤销');
      if (record.expires_at && new Date(record.expires_at) < new Date())
        return h(Tag, { color: 'orange' }, () => '已过期');
      if (record.max_uses > 0 && record.used_count >= record.max_uses)
        return h(Tag, { color: 'red' }, () => '已用完');
      return h(Tag, { color: 'green' }, () => '有效');
    },
    sorter: (a: InviteCodeItem, b: InviteCodeItem) =>
      Number(b.is_active) - Number(a.is_active),
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: '默认角色',
    key: 'default_role',
    width: 100,
    customRender: ({ record }: { record: InviteCodeItem }) => {
      if (!record.default_role_name) return '-';
      return h(Tag, { color: 'blue' }, () => record.default_role_name);
    },
  },
  {
    title: '使用',
    key: 'usage',
    width: 150,
    customRender: ({ record }: { record: InviteCodeItem }) => {
      const canClick = record.used_count > 0;
      if (record.max_uses <= 0)
        return canClick
          ? h(
              'a',
              {
                style: 'font-size:12px;cursor:pointer;color:#1677ff',
                onClick: () => showCodeUsers(record),
              },
              `${record.used_count} / 不限`,
            )
          : h(
              'span',
              { style: 'font-size:12px;color:#999' },
              `${record.used_count} / 不限`,
            );
      const pct = Math.round(
        (record.used_count / Math.max(record.max_uses, 1)) * 100,
      );
      let strokeColor: string;
      if (pct >= 100) strokeColor = '#f5222d';
      else if (pct >= 80) strokeColor = '#fa8c16';
      else strokeColor = '#52c41a';
      if (canClick)
        return h(
          'a',
          {
            style:
              'display:flex;align-items:center;gap:8px;cursor:pointer;color:inherit;text-decoration:none',
            onClick: () => showCodeUsers(record),
          },
          [
            h(
              'span',
              { style: 'white-space:nowrap;font-size:12px' },
              `${record.used_count} / ${record.max_uses}`,
            ),
            h(Progress, {
              percent: Math.min(pct, 100),
              size: 'small',
              strokeColor,
              showInfo: false,
              style: 'flex:1',
            }),
          ],
        );
      return h(
        'span',
        { style: 'font-size:12px;color:#999' },
        `${record.used_count} / ${record.max_uses}`,
      );
    },
  },
  {
    title: '过期时间',
    key: 'expiry',
    width: 160,
    customRender: ({ record }: { record: InviteCodeItem }) => {
      if (!record.expires_at) return '永不过期';
      const created = new Date(
        record.created_at || record.expires_at,
      ).getTime();
      const expires = new Date(record.expires_at).getTime();
      const now = Date.now();
      if (now >= expires) return h(Tag, { color: 'red' }, () => '已过期');
      const total = expires - created;
      const elapsed = now - created;
      const pct = Math.round((elapsed / total) * 100);
      const remaining = Math.max(0, expires - now);
      const days = Math.round(remaining / 86_400_000);
      const fullDate = new Date(record.expires_at).toLocaleString('zh-CN');
      let strokeColor: string;
      if (pct >= 90) strokeColor = '#f5222d';
      else if (pct >= 70) strokeColor = '#fa8c16';
      else strokeColor = '#1677ff';
      return h(Tooltip, { title: fullDate }, () =>
        h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h(
            'span',
            { style: 'white-space:nowrap;font-size:12px' },
            `${days}天`,
          ),
          h(Progress, {
            percent: Math.min(pct, 100),
            size: 'small',
            strokeColor,
            showInfo: false,
            style: 'flex:1',
          }),
        ]),
      );
    },
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 120,
    customRender: ({ text }: { text: null | string }) => text || '-',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
    sorter: (a: InviteCodeItem, b: InviteCodeItem) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime(),
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: '创建者',
    dataIndex: 'created_by_username',
    key: 'created_by',
    width: 120,
  },
  { title: '操作', key: 'action', width: 100 },
];

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  message.success('已复制');
}

async function handleReactivate(code: InviteCodeItem) {
  await reactivateInviteCodeApi(code.id);
  message.success('已重新激活');
  fetchData();
}

function isCodeExpired(code: InviteCodeItem) {
  return code.expires_at && new Date(code.expires_at) < new Date();
}

function isCodeInvalid(code: InviteCodeItem) {
  if (!code.is_active) return true;
  if (isCodeExpired(code)) return true;
  if (code.max_uses > 0 && code.used_count >= code.max_uses) return true;
  return false;
}

async function handlePermanentDelete(code: InviteCodeItem) {
  const invalid = isCodeInvalid(code);
  Modal.confirm({
    title: invalid ? '确定删除该邀请码？' : '该邀请码仍在有效期内',
    content: invalid ? '删除后不可恢复' : '该邀请码仍然有效，确定要删除吗？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await permanentlyDeleteInviteCodeApi(code.id);
      message.success('已删除');
      fetchData();
    },
  });
}

// Edit modal
const editModalVisible = ref(false);
const editingCode = ref<InviteCodeItem | null>(null);
const editDefaultRoleId = ref<number | undefined>(undefined);
const editMaxUses = ref(1);
const editExpiresAt = ref<any>(null);
const editExpiresDays = ref(0);
const editRemark = ref('');

function onEditExpiresAtChange(d: any) {
  editExpiresDays.value = d
    ? Math.max(0, Math.round(d.diff(dayjs(), 'day', true)))
    : 0;
}
function onEditExpiresDaysChange() {
  editExpiresAt.value =
    editExpiresDays.value > 0
      ? dayjs().add(editExpiresDays.value, 'day')
      : null;
}

function openEditModal(code: InviteCodeItem) {
  if (!code.is_active) {
    Modal.confirm({
      title: '编辑邀请码',
      content: '被撤销的邀请码不可编辑，是否重新激活？',
      okText: '重新激活',
      cancelText: '取消',
      onOk: async () => {
        await reactivateInviteCodeApi(code.id);
        message.success('已重新激活');
        fetchData();
      },
    });
    return;
  }
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    message.warning('已过期的邀请码无法编辑');
    return;
  }
  editingCode.value = code;
  editDefaultRoleId.value = code.default_role_id ?? undefined;
  editMaxUses.value = code.max_uses;
  editExpiresAt.value = code.expires_at ? dayjs(code.expires_at) : null;
  editExpiresDays.value = code.expires_at
    ? Math.max(0, Math.round(dayjs(code.expires_at).diff(dayjs(), 'day', true)))
    : 0;
  editRemark.value = code.remark || '';
  editModalVisible.value = true;
}

async function handleEditSave() {
  if (!editingCode.value) return;
  saving.value = true;
  try {
    await editInviteCodeApi(editingCode.value.id, {
      default_role_id:
        editDefaultRoleId.value === editingCode.value.default_role_id
          ? undefined
          : editDefaultRoleId.value,
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
      remark: editRemark.value || '',
    });
    message.success('保存成功');
    editModalVisible.value = false;
    fetchData();
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}

async function handleCreate() {
  if (!defaultRoleId.value) {
    message.error('请选择默认角色');
    return;
  }
  saving.value = true;
  try {
    await createInviteCodeApi({
      default_role_id: defaultRoleId.value,
      expires_at: expiresAt.value?.toISOString?.() ?? undefined,
      max_uses: maxUses.value,
      remark: remark.value || undefined,
    });
    message.success('邀请码已生成');
    modalVisible.value = false;
    defaultRoleId.value = undefined;
    maxUses.value = 1;
    expiresAt.value = dayjs().add(7, 'day');
    expiresDays.value = 7;
    remark.value = '';
    fetchData();
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}

async function handleDelete(code: InviteCodeItem) {
  Modal.confirm({
    title: `确定撤销邀请码「${code.code}」？`,
    content: '撤销后该邀请码将无法使用',
    okType: 'danger',
    onOk: async () => {
      await deleteInviteCodeApi(code.id);
      message.success('已撤销');
      fetchData();
    },
  });
}

async function fetchData() {
  loading.value = true;
  try {
    const [codesData, settings, roles] = await Promise.all([
      getInviteCodesApi(),
      getSystemSettingsBatchApi([
        'require_invite_code',
        'open_registration',
        'default_registration_role',
        'email_domain_mode',
        'email_domain_whitelist',
        'email_domain_blacklist',
        'username_audit_enabled',
        'username_audit_base_url',
        'username_audit_model',
        'username_audit_api_key',
        'username_audit_prompt',
        'username_audit_fail_open',
      ]),
      getAvailableRolesApi(),
    ]);
    codes.value = codesData;
    inviteRequired.value = settings.require_invite_code === 'true';
    openRegistration.value = settings.open_registration !== 'false';
    availableRoles.value = roles;
    fallbackRoleId.value = settings.default_registration_role
      ? Number(settings.default_registration_role)
      : undefined;
    emailDomainMode.value = settings.email_domain_mode || 'off';
    emailDomainWhitelist.value = settings.email_domain_whitelist || '';
    emailDomainBlacklist.value = settings.email_domain_blacklist || '';
    auditSettings.value = {
      api_key: settings.username_audit_api_key || '',
      base_url: settings.username_audit_base_url || '',
      enabled: settings.username_audit_enabled || 'false',
      fail_open: settings.username_audit_fail_open || 'true',
      model: settings.username_audit_model || '',
      prompt: settings.username_audit_prompt || '',
    };
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Page>
    <Space style="margin-bottom: 16px">
      <Button type="primary" @click="modalVisible = true">生成邀请码</Button>
      <Space>
        <span>开放注册</span>
        <Switch
          :checked="openRegistration"
          @change="toggleOpenRegistration as any"
        />
      </Space>
      <Space>
        <span>要求邀请码注册</span>
        <Switch
          :checked="inviteRequired"
          @change="toggleInviteRequired as any"
        />
      </Space>
      <Space>
        <span>降级注册角色</span>
        <Select
          :value="fallbackRoleId"
          placeholder="选择角色"
          style="width: 140px"
          :options="availableRoles.map((r) => ({ label: r.name, value: r.id }))"
          @change="handleFallbackRoleChange"
        />
      </Space>
    </Space>
    <Button
      style="margin-top: 12px; margin-left: 8px"
      @click="openEmailDomainModal"
    >
      邮箱过滤{{
        emailDomainMode === 'whitelist'
          ? '：白名单'
          : emailDomainMode === 'blacklist'
            ? '：黑名单'
            : ''
      }}
    </Button>
    <Button style="margin-top: 12px; margin-left: 8px" @click="openAuditModal">
      用户名审核{{ auditSettings.enabled === 'true' ? '：已启用' : '' }}
    </Button>

    <Table
      :columns="columns"
      :data-source="codes"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              size="small"
              @click="openEditModal(record as InviteCodeItem)"
            >
              编辑
            </Button>
            <Button
              size="small"
              @click="copyCode((record as InviteCodeItem).code)"
            >
              复制
            </Button>
            <Button
              v-if="(record as InviteCodeItem).is_active"
              size="small"
              danger
              @click="handleDelete(record as InviteCodeItem)"
            >
              撤销
            </Button>
            <Button
              v-else
              size="small"
              type="primary"
              @click="handleReactivate(record as InviteCodeItem)"
            >
              激活
            </Button>
            <Button
              size="small"
              danger
              type="text"
              @click="handlePermanentDelete(record as InviteCodeItem)"
            >
              删除
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      title="生成邀请码"
      @ok="handleCreate"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>默认角色</label>
        <Select
          v-model:value="defaultRoleId"
          placeholder="请选择角色"
          style="width: 100%; margin-top: 4px"
          :options="availableRoles.map((r) => ({ label: r.name, value: r.id }))"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>最大使用次数（0 = 不限）</label>
        <InputNumber
          v-model:value="maxUses"
          :min="0"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div>
        <label>过期时间</label>
        <div style="display: flex; gap: 8px; margin-top: 4px">
          <DatePicker
            v-model:value="expiresAt"
            :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
            show-time
            format="YYYY-MM-DD HH:mm"
            placeholder="永不过期"
            allow-clear
            style="flex: 1"
            @change="onExpiresAtChange"
          />
          <InputNumber
            v-model:value="expiresDays"
            :min="0"
            :max="365"
            addon-after="天后过期"
            style="width: 140px"
            @change="onExpiresDaysChange"
          />
        </div>
      </div>
      <div style="margin-top: 12px">
        <label>备注</label>
        <Input
          v-model:value="remark"
          placeholder="可选"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

    <Modal
      v-model:open="editModalVisible"
      title="编辑邀请码"
      @ok="handleEditSave"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>邀请码</label>
        <Input :value="editingCode?.code" disabled style="margin-top: 4px" />
      </div>
      <div style="margin-bottom: 12px">
        <label>默认角色</label>
        <Select
          v-model:value="editDefaultRoleId"
          placeholder="请选择角色"
          :disabled="(editingCode?.used_count ?? 0) > 0"
          style="width: 100%; margin-top: 4px"
          :options="availableRoles.map((r) => ({ label: r.name, value: r.id }))"
        />
        <span
          v-if="(editingCode?.used_count ?? 0) > 0"
          style="font-size: 12px; color: #999"
        >
          已有用户使用，不可修改默认角色
        </span>
      </div>
      <div style="margin-bottom: 12px">
        <label>最大使用次数（0 = 不限）</label>
        <InputNumber
          v-model:value="editMaxUses"
          :min="0"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>过期时间</label>
        <div style="display: flex; gap: 8px; margin-top: 4px">
          <DatePicker
            v-model:value="editExpiresAt"
            show-time
            format="YYYY-MM-DD HH:mm"
            placeholder="不变"
            allow-clear
            style="flex: 1"
            @change="onEditExpiresAtChange"
          />
          <InputNumber
            v-model:value="editExpiresDays"
            :min="0"
            :max="365"
            addon-after="天后过期"
            style="width: 140px"
            @change="onEditExpiresDaysChange"
          />
        </div>
        <div>
          <label>备注</label>
          <Input
            v-model:value="editRemark"
            placeholder="可选"
            style="margin-top: 4px"
          />
        </div>
      </div>
    </Modal>

    <!-- Users by code drawer -->
    <Drawer
      v-model:open="userDrawerVisible"
      :title="`使用邀请码 ${userDrawerCode} 的用户`"
      :width="500"
    >
      <List
        :data-source="userDrawerItems"
        :loading="userDrawerLoading"
        size="small"
      >
        <template #renderItem="{ item: r }">
          <List.Item>
            <List.Item.Meta>
              <template #title>{{ r.username }}</template>
              <template #description>
                {{ r.email }}
                <span
                  v-if="r.created_at"
                  style="margin-left: 12px; color: #999"
                >
                  {{ new Date(r.created_at).toLocaleString('zh-CN') }}
                </span>
              </template>
            </List.Item.Meta>
          </List.Item>
        </template>
      </List>
    </Drawer>

    <!-- Email domain filter modal -->
    <Modal
      v-model:open="emailDomainModalVisible"
      title="邮箱域名过滤"
      @ok="saveEmailDomainSettings"
    >
      <div style="margin-bottom: 12px">
        <label>过滤模式</label>
        <Select
          v-model:value="emailDomainModalMode"
          style="width: 100%; margin-top: 4px"
          :options="[
            { label: '不开启', value: 'off' },
            { label: '白名单', value: 'whitelist' },
            { label: '黑名单', value: 'blacklist' },
          ]"
          @change="onEmailDomainModeChange"
        />
      </div>
      <div v-if="emailDomainModalMode !== 'off'">
        <label>域名列表</label>
        <Input.TextArea
          v-model:value="emailDomainModalList"
          :rows="6"
          placeholder="gmail.com&#10;outlook.com"
          style="margin-top: 4px"
        />
        <span style="font-size: 12px; color: #999">每行一个域名，如 gmail.com</span>
      </div>
    </Modal>

    <!-- Username audit modal -->
    <Modal
      v-model:open="auditModalVisible"
      title="用户名 AI 审核"
      @ok="saveAuditSettings"
    >
      <div style="margin-bottom: 12px">
        <label>启用审核</label>
        <Switch
          :checked="auditEnabled"
          @change="auditEnabled = $event as boolean"
          style="margin-left: 8px"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>API 地址</label>
        <Input
          v-model:value="auditBaseUrl"
          placeholder="https://api.openai.com/v1"
          style="margin-top: 4px"
        />
        <span style="font-size: 12px; color: #999">兼容 OpenAI 接口格式的 API 地址</span>
      </div>
      <div style="margin-bottom: 12px">
        <label>模型</label>
        <div style="display: flex; gap: 8px; margin-top: 4px">
          <AutoComplete
            v-model:value="auditModel"
            :options="auditModelOptions"
            placeholder="gpt-4o-mini"
            style="flex: 1"
            allow-clear
          />
          <Button :loading="fetchingModels" @click="handleFetchModels">
            获取模型列表
          </Button>
        </div>
      </div>
      <div style="margin-bottom: 12px">
        <label>API Key</label>
        <Input.Password
          v-model:value="auditApiKey"
          placeholder="sk-..."
          style="margin-top: 4px"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>审核 Prompt（{username} 会被替换为实际用户名）</label>
        <Input.TextArea
          v-model:value="auditPrompt"
          :rows="4"
          placeholder="请审核用户名是否合适，拒绝侮辱性、冒充官方、垃圾广告类用户名"
          style="margin-top: 4px"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>审核失败时放行</label>
        <Switch
          :checked="auditFailOpen"
          @change="auditFailOpen = $event as boolean"
          style="margin-left: 8px"
        />
      </div>
    </Modal>
  </Page>
</template>
