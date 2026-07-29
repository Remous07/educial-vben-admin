<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { PermissionItem, RoleItem } from '#/api/core';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Checkbox,
  Collapse,
  Input,
  message,
  Modal,
  Space,
  Table,
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

const modalVisible = ref(false);
const editingRole = ref<null | RoleItem>(null);
const formName = ref('');
const formRemark = ref('');
const formPermissionIds = ref<number[]>([]);
const saving = ref(false);

const isEditing = computed(() => !!editingRole.value);

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  users: '用户',
  messages: '消息',
  visitors: '访客',
  conversation: '对话',
  invite: '邀请码',
  admin: '系统管理',
};

const permissionGroups = computed(() => {
  const groups: Record<string, PermissionItem[]> = {};
  for (const perm of permissions.value) {
    const prefix = perm.code.split(':')[0] || 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(perm);
  }
  // Sort by category label order
  return Object.entries(groups).toSorted(([a], [b]) => {
    const labels = Object.keys(CATEGORY_LABELS);
    return labels.indexOf(a) - labels.indexOf(b);
  });
});

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
  {
    title: '备注',
    dataIndex: 'description',
    key: 'description',
    width: 200,
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  { title: '操作', key: 'action', width: 180 },
];

function openCreateModal() {
  editingRole.value = null;
  formName.value = '';
  formRemark.value = '';
  formPermissionIds.value = [];
  modalVisible.value = true;
}

function openEditModal(role: RoleItem) {
  editingRole.value = role;
  formName.value = role.name;
  formRemark.value = role.description || '';
  formPermissionIds.value = role.permissions.map((p) => p.id);
  modalVisible.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    const payload = {
      name: formName.value,
      description: formRemark.value,
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
      <div style="margin-bottom: 12px">
        <label>备注</label>
        <Input
          v-model:value="formRemark"
          placeholder="角色说明"
          style="margin-top: 4px"
        />
      </div>
      <div>
        <label>权限</label>
        <Collapse v-if="permissions.length" style="margin-top: 4px">
          <Collapse.Panel
            v-for="[prefix, perms] in permissionGroups"
            :key="prefix"
            :header="`${CATEGORY_LABELS[prefix] || prefix} (${perms.length})`"
          >
            <div style="display: flex; flex-direction: column; gap: 4px">
              <Checkbox
                v-for="perm in perms"
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
          </Collapse.Panel>
        </Collapse>
      </div>
    </Modal>
  </Page>
</template>
