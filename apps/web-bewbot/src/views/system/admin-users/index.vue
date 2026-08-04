<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { AdminUserItem, RoleItem } from '#/api/core';

import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  assignRolesApi,
  banAdminUserApi,
  deleteAdminUserApi,
  getAdminUsersApi,
  getRolesApi,
  unbanAdminUserApi,
} from '#/api/core';

defineOptions({ name: 'AdminUsers' });

const users = ref<AdminUserItem[]>([]);
const roles = ref<RoleItem[]>([]);
const loading = ref(false);

// ── filters ────────────────────────────────────────────
const searchText = ref('');
const statusPreset = ref<'all' | 'banned' | 'normal' | 'unverified'>('all');
const statusFlags = ref<string[]>([]);
const selectedRole = ref<string | undefined>(undefined);
const registerRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

const STATUS_FLAG_OPTIONS = [
  { label: '已封禁', value: 'banned' },
  { label: '邮箱未验证', value: 'unverified' },
  { label: '已开启 TOTP', value: 'totp' },
  { label: '已绑定 TG', value: 'bound' },
  { label: 'TG 会员', value: 'premium' },
];

const roleOptions = computed(() =>
  roles.value.map((r) => ({ label: r.name, value: r.name })),
);

function matchesStatusPreset(u: AdminUserItem): boolean {
  if (statusPreset.value === 'normal') return !u.is_banned && u.email_verified;
  if (statusPreset.value === 'banned') return u.is_banned;
  if (statusPreset.value === 'unverified') return !u.email_verified;
  return true;
}

function matchesStatusFlags(u: AdminUserItem): boolean {
  const flags = new Set(statusFlags.value);
  if (flags.has('banned') && !u.is_banned) return false;
  if (flags.has('unverified') && u.email_verified) return false;
  if (flags.has('totp') && !u.totp_enabled) return false;
  if (flags.has('bound') && !u.is_bound) return false;
  if (flags.has('premium') && !u.telegram_is_premium) return false;
  return true;
}

const filteredUsers = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  return users.value.filter((u) => {
    // 搜索：用户名 / 邮箱 / TG 用户名 / TG 用户 ID
    if (q) {
      const haystack = [
        u.username,
        u.email,
        u.telegram_username || '',
        u.telegram_id ? String(u.telegram_id) : '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // 状态：统计卡预设 与 状态下拉 互斥（设计约定，仅其中一者生效）
    if (statusPreset.value !== 'all' && !matchesStatusPreset(u)) return false;
    if (statusFlags.value.length > 0 && !matchesStatusFlags(u)) return false;
    // 角色（单选）
    if (selectedRole.value && !u.roles.includes(selectedRole.value))
      return false;
    // 注册时间范围（含起止当天）
    if (registerRange.value) {
      const created = u.created_at
        ? new Date(u.created_at).getTime()
        : Number.NaN;
      const start = registerRange.value[0].startOf('day').valueOf();
      const end = registerRange.value[1].endOf('day').valueOf();
      if (Number.isNaN(created) || created < start || created > end)
        return false;
    }
    return true;
  });
});

// 点统计卡 = 设置状态预设；与状态下拉互斥（清空下拉）
function setStatusPreset(preset: 'all' | 'banned' | 'normal' | 'unverified') {
  statusFlags.value = [];
  statusPreset.value =
    statusPreset.value === preset && preset !== 'all' ? 'all' : preset;
}

// 手动改状态下拉 = 回到「全部」预设（清掉卡片高亮）
function onStatusFlagsChange() {
  statusPreset.value = 'all';
}

function resetFilters() {
  searchText.value = '';
  statusPreset.value = 'all';
  statusFlags.value = [];
  selectedRole.value = undefined;
  registerRange.value = undefined;
}

const normalCount = computed(
  () => users.value.filter((u) => !u.is_banned && u.email_verified).length,
);
const bannedCount = computed(
  () => users.value.filter((u) => u.is_banned).length,
);
const unverifiedCount = computed(
  () => users.value.filter((u) => !u.email_verified).length,
);

// Edit modal
const modalVisible = ref(false);
const selectedUser = ref<AdminUserItem | null>(null);
const selectedRoleIds = ref<number[]>([]);
const saving = ref(false);

// Bot info modal
const botModalVisible = ref(false);
const botModalUser = ref<AdminUserItem | null>(null);

function openBotModal(user: AdminUserItem) {
  botModalUser.value = user;
  botModalVisible.value = true;
}

function avatarChar(name: string): string {
  const match = name.match(/\p{L}/u);
  return match ? match[0].toUpperCase() : '?';
}

function avatarColor(id: number, name: string): string {
  const base = Math.trunc((id * 2_654_435_761) % 4_294_967_296) % 360;
  let offset = 0;
  for (const ch of name)
    offset = Math.trunc((offset << 5) - offset + (ch.codePointAt(0) ?? 0));
  const hue = (base + (offset % 20) - 10 + 360) % 360;
  return `hsl(${hue}, 50%, 40%)`;
}

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
  {
    title: '用户名',
    key: 'username',
    width: 150,
    customRender: ({ record }: { record: AdminUserItem }) =>
      h('div', { style: 'display:flex; align-items:center; gap:8px' }, [
        h(
          'span',
          {
            style: {
              display: 'inline-flex',
              width: '28px',
              height: '28px',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: avatarColor(record.id, record.username),
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
            },
          },
          avatarChar(record.username),
        ),
        h('span', {}, record.username),
      ]),
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 150,
    ellipsis: true,
  },
  {
    title: 'TOTP',
    dataIndex: 'totp_enabled',
    key: 'totp_enabled',
    width: 70,
    align: 'center',
    customRender: ({ text }: { text: boolean }) =>
      text ? h(Tag, { color: 'green' }, () => '已开启') : h(Tag, () => '关闭'),
  },
  {
    title: '邀请码',
    dataIndex: 'invite_code',
    key: 'invite_code',
    width: 160,
    customRender: ({ text }: { text: null | string }) =>
      text ? h('code', { style: { fontSize: '13px' } }, text) : '-',
  },
  {
    title: '邀请人',
    dataIndex: 'invited_by',
    key: 'invited_by',
    width: 100,
    customRender: ({ text }: { text: null | string }) => text || '-',
  },
  {
    title: '状态',
    dataIndex: 'is_banned',
    key: 'is_banned',
    width: 70,
    align: 'center',
    customRender: ({ record }: { record: AdminUserItem }) => {
      if (!record.email_verified)
        return h(Tag, { color: 'orange' }, () => '未验证');
      if (record.is_banned) return h(Tag, { color: 'red' }, () => '已封禁');
      return h(Tag, { color: 'green' }, () => '正常');
    },
  },
  {
    title: 'Bot绑定',
    key: 'bot_bind',
    width: 110,
    customRender: ({ record }: { record: AdminUserItem }) => {
      if (!record.is_bound) return '-';
      const label = record.telegram_username
        ? `@${record.telegram_username}`
        : record.telegram_first_name || `TG${record.telegram_id}`;
      return h(
        'a',
        {
          style: { cursor: 'pointer', color: '#1677ff' },
          onClick: () => openBotModal(record),
        },
        label,
      );
    },
  },
  {
    title: '对话识别码',
    dataIndex: 'conversation_code',
    key: 'conversation_code',
    width: 130,
    customRender: ({ text }: { text: null | string }) =>
      text
        ? h('code', { style: { fontSize: '13px', fontWeight: 'bold' } }, text)
        : '-',
  },
  {
    title: '权限组',
    dataIndex: 'roles',
    key: 'roles',
    width: 120,
    customRender: ({ text }: { text: string[] }) =>
      text.length > 0
        ? text.map((r) =>
            h(Tag, { color: 'blue', style: { margin: '1px' } }, () => r),
          )
        : h(Tag, { color: 'default' }, () => '无'),
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  { title: '操作', key: 'action', width: 160 },
];

function openEditModal(user: AdminUserItem) {
  selectedUser.value = user;
  const roleMap = new Map(roles.value.map((r) => [r.name, r.id]));
  selectedRoleIds.value = user.roles
    .map((r) => roleMap.get(r))
    .filter(Boolean) as number[];
  modalVisible.value = true;
}

async function handleSave() {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    await assignRolesApi(selectedUser.value.id, selectedRoleIds.value);
    message.success('保存成功');
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleBan(user: AdminUserItem) {
  Modal.confirm({
    title: `确定封禁用户「${user.username}」？`,
    content: '封禁后该用户将无法登录',
    okText: '封禁',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await banAdminUserApi(user.id);
      message.success('已封禁');
      fetchData();
    },
  });
}

async function handleUnban(user: AdminUserItem) {
  await unbanAdminUserApi(user.id);
  message.success('已解封');
  fetchData();
}

async function handleDelete(user: AdminUserItem) {
  Modal.confirm({
    title: `确定删除用户「${user.username}」？`,
    content: '删除后该用户将无法登录',
    okType: 'danger',
    onOk: async () => {
      await deleteAdminUserApi(user.id);
      message.success('已删除');
      fetchData();
    },
  });
}

async function fetchData() {
  loading.value = true;
  try {
    [users.value, roles.value] = await Promise.all([
      getAdminUsersApi(),
      getRolesApi(),
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Page>
    <Row :gutter="[16, 16]" style="margin-bottom: 16px">
      <Col :xs="12" :sm="6">
        <Card
          class="stat-card-clickable"
          :class="{ 'stat-card-active': statusPreset === 'all' }"
          @click="setStatusPreset('all')"
        >
          <Statistic title="总用户" :value="users.length" />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card
          class="stat-card-clickable"
          :class="{ 'stat-card-active': statusPreset === 'normal' }"
          @click="setStatusPreset('normal')"
        >
          <Statistic
            title="正常"
            :value="normalCount"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card
          class="stat-card-clickable"
          :class="{ 'stat-card-active': statusPreset === 'banned' }"
          @click="setStatusPreset('banned')"
        >
          <Statistic
            title="已封禁"
            :value="bannedCount"
            :value-style="{ color: '#ff4d4f' }"
          />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card
          class="stat-card-clickable"
          :class="{ 'stat-card-active': statusPreset === 'unverified' }"
          @click="setStatusPreset('unverified')"
        >
          <Statistic
            title="未验证"
            :value="unverifiedCount"
            :value-style="{ color: '#fa8c16' }"
          />
        </Card>
      </Col>
    </Row>

    <Space wrap style="margin-bottom: 16px">
      <Select
        v-model:value="statusFlags"
        placeholder="状态"
        multiple
        allow-clear
        style="width: 220px"
        :options="STATUS_FLAG_OPTIONS"
        @change="onStatusFlagsChange"
      />
      <Select
        v-model:value="selectedRole"
        placeholder="角色"
        allow-clear
        style="width: 150px"
        :options="roleOptions"
      />
      <DatePicker.RangePicker
        v-model:value="registerRange"
        :allow-clear="true"
      />
      <Input.Search
        v-model:value="searchText"
        placeholder="搜索用户名 / 邮箱 / TG用户名 / TG ID"
        allow-clear
        style="width: 300px"
      />
      <Button @click="resetFilters">重置</Button>
    </Space>

    <Table
      :columns="columns"
      :data-source="filteredUsers"
      :loading="loading"
      :pagination="{
        defaultPageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (t: number) => `共 ${t} 条`,
      }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              size="small"
              type="primary"
              @click="openEditModal(record as AdminUserItem)"
            >
              编辑
            </Button>
            <template v-if="(record as AdminUserItem).is_banned">
              <Button
                size="small"
                type="primary"
                @click="handleUnban(record as AdminUserItem)"
              >
                解封
              </Button>
            </template>
            <template v-else>
              <Button
                size="small"
                danger
                @click="handleBan(record as AdminUserItem)"
              >
                封禁
              </Button>
            </template>
            <Button
              size="small"
              danger
              @click="handleDelete(record as AdminUserItem)"
            >
              删除
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="440"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            icon="lucide:shield-check"
            style="font-size: 18px; color: #1677ff"
          />
          <span style="font-size: 16px; font-weight: 600">编辑用户</span>
        </Space>
      </template>

      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: #666">用户名</label>
        <Input
          :value="selectedUser?.username"
          disabled
          style="margin-top: 6px"
        />
      </div>
      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: #666">邮箱</label>
        <Input :value="selectedUser?.email" disabled style="margin-top: 6px" />
      </div>
      <div>
        <label style="font-size: 13px; color: #666">权限组</label>
        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 6px;
          "
        >
          <Checkbox
            v-for="role in roles"
            :key="role.id"
            :checked="selectedRoleIds.includes(role.id)"
            @change="
              (e: any) => {
                if (e.target.checked) {
                  selectedRoleIds.push(role.id);
                } else {
                  selectedRoleIds = selectedRoleIds.filter(
                    (id) => id !== role.id,
                  );
                }
              }
            "
          >
            {{ role.name }} — {{ role.description || '无备注' }}
          </Checkbox>
        </div>
      </div>
    </Modal>

    <Modal
      v-model:open="botModalVisible"
      title="TG 用户信息"
      :footer="null"
      :width="400"
    >
      <Descriptions v-if="botModalUser" :column="1" size="small" bordered>
        <Descriptions.Item label="Telegram ID">
          <code>{{ botModalUser.telegram_id }}</code>
        </Descriptions.Item>
        <Descriptions.Item label="昵称">
          {{ botModalUser.telegram_first_name || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="用户名">
          <template v-if="botModalUser.telegram_username">
            <a
              :href="`https://t.me/${botModalUser.telegram_username}`"
              target="_blank"
            >
              @{{ botModalUser.telegram_username }}
            </a>
          </template>
          <template v-else>-</template>
        </Descriptions.Item>
        <Descriptions.Item label="Pre">
          <Tag v-if="botModalUser.telegram_is_premium" color="gold"> Pre </Tag>
          <template v-else>否</template>
        </Descriptions.Item>
        <Descriptions.Item label="绑定时间">
          {{
            botModalUser.bound_at
              ? new Date(botModalUser.bound_at).toLocaleString('zh-CN')
              : '-'
          }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  </Page>
</template>

<style scoped>
.stat-card-clickable {
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}

.stat-card-clickable:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.stat-card-active {
  border-color: #1677ff;
  box-shadow: 0 0 0 1px #1677ff;
}
</style>
