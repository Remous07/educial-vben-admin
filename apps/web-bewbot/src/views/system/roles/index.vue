<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { PermissionItem, RoleItem } from '#/api/core';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

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

const { isDark } = usePreferences();

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

const isEditing = computed(() => !!editingRole.value);

const dimTextStyle = computed(() => ({
  fontSize: '13px',
  color: isDark.value ? 'rgba(255,255,255,0.6)' : '#666',
}));

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  users: '用户',
  messages: '消息',
  conversation: '对话',
  invite: '邀请码',
  visitors: '访客',
  system: '系统权限',
  profile: '个人设置',
};

const CATEGORY_ICONS: Record<string, string> = {
  dashboard: 'lucide:layout-dashboard',
  users: 'lucide:users',
  messages: 'lucide:message-square',
  conversation: 'lucide:message-circle',
  invite: 'lucide:gift',
  visitors: 'lucide:ban',
  system: 'lucide:shield',
  profile: 'lucide:settings',
};

// 系统管理类权限合并为「系统权限」一组：
// 后台用户(admin) + 注册设置(registration) + 日志审计(audit) + 机器人设置(bot)
const SYSTEM_PREFIXES = new Set(['admin', 'audit', 'bot', 'registration']);

function groupOf(code: string): string {
  const prefix = code.split(':')[0] || 'other';
  return SYSTEM_PREFIXES.has(prefix) ? 'system' : prefix;
}

const permissionGroups = computed(() => {
  const groups: Record<string, PermissionItem[]> = {};
  for (const perm of permissions.value) {
    const key = groupOf(perm.code);
    (groups[key] ??= []).push(perm);
  }
  return Object.entries(groups).toSorted(([a], [b]) => {
    const labels = Object.keys(CATEGORY_LABELS);
    return labels.indexOf(a) - labels.indexOf(b);
  });
});

function selectedCount(perms: PermissionItem[]): number {
  return perms.filter((p) => formPermissionIds.value.includes(p.id)).length;
}

function groupTagColor(perms: PermissionItem[]): string {
  const n = selectedCount(perms);
  if (n === 0) return 'default';
  return n === perms.length ? 'success' : 'processing';
}

function togglePermission(perm: PermissionItem) {
  const idx = formPermissionIds.value.indexOf(perm.id);
  formPermissionIds.value =
    idx === -1
      ? [...formPermissionIds.value, perm.id]
      : formPermissionIds.value.filter((id) => id !== perm.id);
}

const allGroupsExpanded = computed(() => {
  const total = permissionGroups.value.length;
  return total > 0 && activePermGroups.value.length === total;
});

function toggleAllGroups() {
  activePermGroups.value = allGroupsExpanded.value
    ? []
    : permissionGroups.value.map(([key]) => key);
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
      @ok="handleSave"
      @cancel="activePermGroups = []"
      :confirm-loading="saving"
      :width="560"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            :icon="isEditing ? 'lucide:edit' : 'lucide:user-plus'"
            style="font-size: 18px; color: #1677ff"
          />
          <span style="font-size: 16px; font-weight: 600">
            {{ isEditing ? '编辑角色' : '创建角色' }}
          </span>
        </Space>
      </template>

      <div style="margin-bottom: 16px">
        <label :style="dimTextStyle">角色名称</label>
        <Input
          v-model:value="formName"
          placeholder="如：编辑"
          style="margin-top: 6px"
        />
      </div>
      <div style="margin-bottom: 16px">
        <label :style="dimTextStyle">备注</label>
        <Input.TextArea
          v-model:value="formRemark"
          placeholder="角色说明"
          :rows="2"
          style="margin-top: 6px"
        />
      </div>
      <div>
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          "
        >
          <label :style="dimTextStyle">
            <IconifyIcon
              icon="lucide:shield"
              style="margin-right: 4px; vertical-align: -2px"
            />
            权限
          </label>
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
                <IconifyIcon
                  :icon="CATEGORY_ICONS[prefix] || 'lucide:folder'"
                  style="
                    margin-right: 6px;
                    vertical-align: -2px;
                    color: #1677ff;
                  "
                />
                {{ CATEGORY_LABELS[prefix] || prefix }}
              </span>
              <Tag :color="groupTagColor(perms)" style="margin-left: 8px">
                {{ selectedCount(perms) }} / {{ perms.length }}
              </Tag>
            </template>
            <div
              v-for="perm in perms"
              :key="perm.id"
              class="perm-item"
              :class="{
                'is-selected': formPermissionIds.includes(perm.id),
                'is-dark': isDark,
              }"
              @click="togglePermission(perm)"
            >
              <Checkbox
                :checked="formPermissionIds.includes(perm.id)"
                style="flex-shrink: 0; pointer-events: none"
              />
              <Tag class="perm-code" color="processing">{{ perm.code }}</Tag>
              <span class="perm-name">{{ perm.name }}</span>
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
            icon="lucide:triangle-alert"
            style="font-size: 18px; color: #faad14"
          />
          <span style="font-size: 16px; font-weight: 600">删除角色</span>
        </Space>
      </template>

      <!-- Metric cards -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px">
        <div class="metric-card" :class="{ 'is-dark': isDark }">
          <div class="metric-label">角色名</div>
          <div class="metric-name">{{ deleteTarget?.name }}</div>
        </div>
        <div class="metric-card" :class="{ 'is-dark': isDark }">
          <div class="metric-label">权限数</div>
          <div class="metric-num" style="color: #1677ff">
            {{ deleteTarget?.permissions?.length ?? 0 }}
          </div>
        </div>
        <div class="metric-card" :class="{ 'is-dark': isDark }">
          <div class="metric-label">用户数</div>
          <div class="metric-num" style="color: #fa541c">
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
        <label :style="dimTextStyle">请输入角色名确认：</label>
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
              style="font-size: 16px; color: #52c41a"
            />
          </template>
        </Input>
        <div
          v-if="deleteConfirmName && deleteConfirmName !== deleteTarget?.name"
          style="margin-top: 4px; font-size: 12px; color: #ff4d4f"
        >
          角色名不匹配，无法删除
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.perm-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.perm-item + .perm-item {
  margin-top: 4px;
}

.perm-item:hover {
  background-color: #fafafa;
}

.perm-item.is-dark:hover {
  background-color: rgb(255 255 255 / 4%);
}

.perm-item.is-selected {
  background-color: #f0f5ff;
  border-color: #d6e4ff;
}

.perm-item.is-dark.is-selected {
  background-color: rgb(64 128 255 / 14%);
  border-color: rgb(64 128 255 / 30%);
}

.perm-code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.perm-name {
  font-size: 13px;
  color: #333;
}

.perm-item.is-dark .perm-name {
  color: rgb(255 255 255 / 75%);
}

.metric-card {
  flex: 1;
  padding: 12px 8px;
  text-align: center;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.metric-card.is-dark {
  background: rgb(255 255 255 / 6%);
  border-color: rgb(255 255 255 / 10%);
}

.metric-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #999;
}

.metric-card.is-dark .metric-label {
  color: rgb(255 255 255 / 45%);
}

.metric-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #1d1d1d;
  word-break: break-all;
}

.metric-card.is-dark .metric-name {
  color: rgb(255 255 255 / 85%);
}

.metric-num {
  font-size: 20px;
  font-weight: 700;
}
</style>
