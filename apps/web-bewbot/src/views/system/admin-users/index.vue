<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { AdminUserItem, RoleItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Select, Table, Tag } from 'ant-design-vue';

import { assignRolesApi, getAdminUsersApi, getRolesApi } from '#/api/core';

defineOptions({ name: 'AdminUsers' });

const users = ref<AdminUserItem[]>([]);
const roles = ref<RoleItem[]>([]);
const loading = ref(false);

// Role assignment modal
const modalVisible = ref(false);
const selectedUser = ref<AdminUserItem | null>(null);
const selectedRoleIds = ref<number[]>([]);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 150 },
  {
    title: '角色',
    dataIndex: 'roles',
    key: 'roles',
    customRender: ({ text }: { text: string[] }) =>
      text.length > 0
        ? text.map((r) =>
            h(Tag, { color: 'blue', style: { margin: '1px' } }, () => r),
          )
        : h(Tag, { color: 'default' }, () => '无角色'),
  },
  { title: '操作', key: 'action', width: 120 },
];

function openRoleModal(user: AdminUserItem) {
  selectedUser.value = user;
  // Pre-select existing role IDs
  const roleMap = new Map(roles.value.map((r) => [r.name, r.id]));
  selectedRoleIds.value = user.roles
    .map((r) => roleMap.get(r))
    .filter(Boolean) as number[];
  modalVisible.value = true;
}

async function handleAssignRoles() {
  if (!selectedUser.value) return;
  try {
    await assignRolesApi(selectedUser.value.id, selectedRoleIds.value);
    message.success('角色分配成功');
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('角色分配失败');
  }
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
          <Button
            size="small"
            type="primary"
            @click="openRoleModal(record as AdminUserItem)"
          >
            分配角色
          </Button>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      title="分配角色"
      @ok="handleAssignRoles"
      :confirm-loading="loading"
    >
      <p style="margin-bottom: 8px">
        用户：<strong>{{ selectedUser?.username }}</strong>
      </p>
      <Select
        v-model:value="selectedRoleIds"
        mode="multiple"
        style="width: 100%"
        placeholder="选择角色"
        :options="roles.map((r) => ({ label: r.name, value: r.id }))"
      />
    </Modal>
  </Page>
</template>
