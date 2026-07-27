<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { PermissionItem, RoleItem } from '#/api/core';

import { computed, h, onMounted, ref } from 'vue';

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
  createRoleApi,
  deleteRoleApi,
  getPermissionsApi,
  getRolesApi,
  updateRoleApi,
} from '#/api/core';

defineOptions({ name: 'RoleManagement' });

const roles = ref<RoleItem[]>([]);
const permissions = ref<PermissionItem[]>([]);
const loading = ref(false);

// Modal state
const modalVisible = ref(false);
const editingRole = ref<null | RoleItem>(null);
const formName = ref('');
const formPermissionIds = ref<number[]>([]);
const saving = ref(false);

const isEditing = computed(() => !!editingRole.value);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  {
    title: '权限',
    dataIndex: 'permissions',
    key: 'permissions',
    customRender: ({ text }: { text: PermissionItem[] }) =>
      text.map((p) =>
        h(Tag, { color: 'green', style: { margin: '1px' } }, () => p.code),
      ),
  },
  { title: '操作', key: 'action', width: 180 },
];

function openCreateModal() {
  editingRole.value = null;
  formName.value = '';
  formPermissionIds.value = [];
  modalVisible.value = true;
}

function openEditModal(role: RoleItem) {
  editingRole.value = role;
  formName.value = role.name;
  formPermissionIds.value = role.permissions.map((p) => p.id);
  modalVisible.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    const payload = {
      name: formName.value,
      permission_ids: formPermissionIds.value,
    };
    if (isEditing.value && editingRole.value) {
      await updateRoleApi(editingRole.value.id, payload);
      message.success('角色已更新');
    } else {
      await createRoleApi(payload);
      message.success('角色已创建');
    }
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(role: RoleItem) {
  Modal.confirm({
    title: `确定删除角色「${role.name}」？`,
    onOk: async () => {
      await deleteRoleApi(role.id);
      message.success('已删除');
      fetchData();
    },
  });
}

async function fetchData() {
  loading.value = true;
  try {
    [roles.value, permissions.value] = await Promise.all([
      getRolesApi(),
      getPermissionsApi(),
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Page>
    <Space style="margin-bottom: 16px">
      <Button type="primary" @click="openCreateModal">创建角色</Button>
    </Space>

    <Table
      :columns="columns"
      :data-source="roles"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button size="small" @click="openEditModal(record as RoleItem)">
              编辑
            </Button>
            <Button
              size="small"
              danger
              @click="handleDelete(record as RoleItem)"
            >
              删除
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      :title="isEditing ? '编辑角色' : '创建角色'"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>角色名称</label>
        <Input
          v-model:value="formName"
          placeholder="如：编辑"
          style="margin-top: 4px"
        />
      </div>
      <div>
        <label>权限</label>
        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 4px;
          "
        >
          <Checkbox
            v-for="perm in permissions"
            :key="perm.id"
            :checked="formPermissionIds.includes(perm.id)"
            @change="
              (e: any) => {
                if (e.target.checked) {
                  formPermissionIds.push(perm.id);
                } else {
                  formPermissionIds = formPermissionIds.filter(
                    (id) => id !== perm.id,
                  );
                }
              }
            "
          >
            {{ perm.code }} — {{ perm.name }}
          </Checkbox>
        </div>
      </div>
    </Modal>
  </Page>
</template>
