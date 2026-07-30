<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { AdminUserItem, RoleItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Checkbox,
  Descriptions,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

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

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 110 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  {
    title: 'TOTP',
    dataIndex: 'totp_enabled',
    key: 'totp_enabled',
    width: 55,
    align: 'center',
    customRender: ({ text }: { text: boolean }) => (text ? '✓' : '—'),
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
    title: '创建时间',
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
    <Table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="false"
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
      title="编辑用户"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>用户名</label>
        <Input
          :value="selectedUser?.username"
          disabled
          style="margin-top: 4px"
        />
      </div>
      <div style="margin-bottom: 12px">
        <label>邮箱</label>
        <Input :value="selectedUser?.email" disabled style="margin-top: 4px" />
      </div>
      <div>
        <label>权限组</label>
        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 4px;
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
