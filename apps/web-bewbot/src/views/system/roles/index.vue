<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { PermissionItem, RoleItem } from '#/api/core';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  createRoleApi,
  deleteRoleApi,
  getPermissionsApi,
  getRolesApi,
  getSystemSettingsBatchApi,
  updateRoleApi,
} from '#/api/core';

defineOptions({ name: 'RoleManagement' });

const roles = ref<RoleItem[]>([]);
const permissions = ref<PermissionItem[]>([]);
const loading = ref(false);
const fallbackRoleId = ref<null | number>(null);

const modalVisible = ref(false);
const editingRole = ref<null | RoleItem>(null);
const formName = ref('');
const formRemark = ref('');
const formPermissionIds = ref<number[]>([]);
const activePermGroups = ref<string[]>([]);
const saving = ref(false);

const allGroupsExpanded = computed(() => {
  const total = permissionGroups.value.length;
  return total > 0 && activePermGroups.value.length === total;
});

function toggleAllGroups() {
  activePermGroups.value = allGroupsExpanded.value
    ? []
    : permissionGroups.value.map(([key]) => key);
}

const isEditing = computed(() => !!editingRole.value);

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  users: '用户',
  messages: '消息',
  visitors: '访客',
  conversation: '对话',
  invite: '邀请码',
  registration: '注册',
  admin: '后台用户',
  bot: '机器人',
  profile: '个人设置',
};

const permissionGroups = computed(() => {
  const groups: Record<string, PermissionItem[]> = {};
  for (const perm of permissions.value) {
    const prefix = perm.code.split(':')[0] || 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(perm);
  }
  return Object.entries(groups).toSorted(([a], [b]) => {
    const labels = Object.keys(CATEGORY_LABELS);
    return labels.indexOf(a) - labels.indexOf(b);
  });
});

function selectedCount(perms: PermissionItem[]): number {
  return perms.filter((p) => formPermissionIds.value.includes(p.id)).length;
}

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
  activePermGroups.value = [];
  modalVisible.value = true;
}

function openEditModal(role: RoleItem) {
  editingRole.value = role;
  formName.value = role.name;
  formRemark.value = role.description || '';
  formPermissionIds.value = role.permissions.map((p) => p.id);
  activePermGroups.value = [];
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
    activePermGroups.value = [];
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(role: RoleItem) {
  deleteTarget.value = role;
  deleteConfirmName.value = '';
  deleteModalVisible.value = true;
}

// ── delete confirmation modal ──

const deleteModalVisible = ref(false);
const deleteTarget = ref<null | RoleItem>(null);
const deleteConfirmName = ref('');
const deleting = ref(false);

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await deleteRoleApi(deleteTarget.value.id);
    message.success('已删除');
    deleteModalVisible.value = false;
    fetchData();
  } catch {
    message.error('删除失败');
  } finally {
    deleting.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const [rolesData, permsData, settings] = await Promise.all([
      getRolesApi(),
      getPermissionsApi(),
      getSystemSettingsBatchApi(['default_registration_role']),
    ]);
    roles.value = rolesData;
    permissions.value = permsData;
    fallbackRoleId.value = settings.default_registration_role
      ? Number(settings.default_registration_role)
      : null;
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
            <Tooltip
              v-if="fallbackRoleId === (record as RoleItem).id"
              title="该角色为降级注册角色，不可删除"
            >
              <Button size="small" danger disabled> 删除 </Button>
            </Tooltip>
            <Button
              v-else
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
      @cancel="activePermGroups = []"
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
        <div
          style="
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 4px;
          "
        >
          <label>权限</label>
          <Button size="small" @click="toggleAllGroups">
            {{ allGroupsExpanded ? '全部折叠' : '全部展开' }}
          </Button>
        </div>
        <Collapse
          v-if="permissions.length"
          v-model:active-key="activePermGroups"
        >
          <Collapse.Panel
            v-for="[prefix, perms] in permissionGroups"
            :key="prefix"
          >
            <template #header>
              <span style="font-weight: 500">
                {{ CATEGORY_LABELS[prefix] || prefix }}
              </span>
              <Tag style="margin-left: 8px">
                {{ selectedCount(perms) }} / {{ perms.length }}
              </Tag>
            </template>
            <div
              v-for="(perm, idx) in perms"
              :key="perm.id"
              :style="{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom:
                  idx < perms.length - 1 ? '1px solid #f0f0f0' : 'none',
              }"
            >
              <Checkbox
                :checked="formPermissionIds.includes(perm.id)"
                style="flex-shrink: 0; min-width: 170px"
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
                <Tag color="processing">{{ perm.code }}</Tag>
              </Checkbox>
              <span style="font-size: 13px; color: #666">{{ perm.name }}</span>
            </div>
          </Collapse.Panel>
        </Collapse>
      </div>
    </Modal>

    <Modal
      v-model:open="deleteModalVisible"
      :confirm-loading="deleting"
      :ok-button-props="{
        disabled: deleteConfirmName !== deleteTarget?.name,
        danger: true,
      }"
      ok-text="删除"
      cancel-text="取消"
      @ok="confirmDelete"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            icon="ant-design:warning-filled"
            style="font-size: 18px; color: #faad14"
          />
          <span style="font-size: 16px; font-weight: 600">删除角色</span>
        </Space>
      </template>

      <!-- Metric cards -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px">
        <div
          style="
            flex: 1;
            padding: 12px 8px;
            text-align: center;
            background: #fafafa;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
          "
        >
          <div style=" margin-bottom: 4px;font-size: 12px; color: #999">
            角色名
          </div>
          <div
            style="
              font-size: 14px;
              font-weight: 600;
              line-height: 1.4;
              color: #1d1d1d;
              word-break: break-all;
            "
          >
            {{ deleteTarget?.name }}
          </div>
        </div>
        <div
          style="
            flex: 1;
            padding: 12px 8px;
            text-align: center;
            background: #fafafa;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
          "
        >
          <div style=" margin-bottom: 4px;font-size: 12px; color: #999">
            权限数
          </div>
          <div style="font-size: 20px; font-weight: 700; color: #1677ff">
            {{ deleteTarget?.permissions?.length ?? 0 }}
          </div>
        </div>
        <div
          style="
            flex: 1;
            padding: 12px 8px;
            text-align: center;
            background: #fafafa;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
          "
        >
          <div style=" margin-bottom: 4px;font-size: 12px; color: #999">
            用户数
          </div>
          <div style="font-size: 20px; font-weight: 700; color: #fa541c">
            {{ deleteTarget?.admin_user_count ?? 0 }}
          </div>
        </div>
      </div>

      <!-- Consequence alert -->
      <Alert
        type="error"
        show-icon
        style="margin-bottom: 16px"
        :message="
          (deleteTarget?.admin_user_count ?? 0) > 0
            ? `删除后 ${deleteTarget?.admin_user_count} 个用户将失去该角色的全部权限`
            : '该角色当前无用户使用，可以安全删除'
        "
        :description="
          (deleteTarget?.admin_user_count ?? 0) > 0
            ? '这些用户不会从系统中移除，仅被赋予降级注册角色。'
            : '此操作不可恢复。'
        "
      />

      <!-- Confirm input -->
      <div>
        <label style="font-size: 13px; color: #666">请输入角色名确认：</label>
        <Input
          v-model:value="deleteConfirmName"
          :placeholder="deleteTarget?.name"
          :status="
            deleteConfirmName && deleteConfirmName !== deleteTarget?.name
              ? 'error'
              : ''
          "
          style="margin-top: 6px"
        >
          <template v-if="deleteConfirmName === deleteTarget?.name" #suffix>
            <IconifyIcon
              icon="ant-design:check-circle-filled"
              style=" font-size: 16px;color: #52c41a"
            />
          </template>
        </Input>
        <div
          v-if="deleteConfirmName && deleteConfirmName !== deleteTarget?.name"
          style=" margin-top: 4px; font-size: 12px;color: #ff4d4f"
        >
          角色名不匹配，无法删除
        </div>
      </div>
    </Modal>
  </Page>
</template>
