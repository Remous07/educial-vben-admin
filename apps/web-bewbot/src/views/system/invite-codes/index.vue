<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { InviteCodeItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Drawer,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Progress,
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
  getInviteCodesApi,
  getSystemSettingApi,
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

// Create modal
const modalVisible = ref(false);
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
      const days = Math.ceil(remaining / 86_400_000);
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
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
      remark: editRemark.value || undefined,
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
  saving.value = true;
  try {
    await createInviteCodeApi({
      expires_at: expiresAt.value?.toISOString?.() ?? undefined,
      max_uses: maxUses.value,
      remark: remark.value || undefined,
    });
    message.success('邀请码已生成');
    modalVisible.value = false;
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
    const [codesData, requiredStr, openRegStr] = await Promise.all([
      getInviteCodesApi(),
      getSystemSettingApi('require_invite_code'),
      getSystemSettingApi('open_registration'),
    ]);
    codes.value = codesData;
    inviteRequired.value = requiredStr === 'true';
    openRegistration.value = openRegStr !== 'false';
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
    </Space>

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
  </Page>
</template>
