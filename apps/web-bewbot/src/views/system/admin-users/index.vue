<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { AdminUserItem, RoleItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Checkbox,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  assignRolesApi,
  deleteAdminUserApi,
  getAdminUsersApi,
  getRolesApi,
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

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
  {
    title: '权限组',
    dataIndex: 'roles',
    key: 'roles',
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
    width: 180,
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
  </Page>
</template>
