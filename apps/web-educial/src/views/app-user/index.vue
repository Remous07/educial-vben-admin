<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Image,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  banAppUserApi,
  batchBanAppUserApi,
  batchUnbanAppUserApi,
  deleteAppUserApi,
  getAppUserApi,
  getAppUserListApi,
  unbanAppUserApi,
  updateAppUserApi,
} from '#/api/modules/app-user';

defineOptions({ name: 'AppUserManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({
  key: '',
  status: undefined as number | undefined,
  timeRange: '' as '' | 'today' | 'week' | 'month',
  dateRange: [] as any[],
});
const sortField = ref('');
const sortOrder = ref('');
const modalVisible = ref(false);
const formData = ref<Record<string, any>>({});
const selectedRowKeys = ref<Key[]>([]);
const selectedRows = ref<any[]>([]);

// 封禁原因
const banReasonVisible = ref(false);
const banReason = ref('');
const pendingBanIds = ref<number[]>([]);

// 编辑
const editModalVisible = ref(false);
const editFormData = ref<Record<string, any>>({});
const editTags = ref<string[]>([]);
const editSaving = ref(false);
const editTagInput = ref('');
const editingTagIndex = ref<number | null>(null);
const editingTagValue = ref('');

const hasSelected = computed(() => selectedRowKeys.value.length > 0);

const rowSelection = computed(() => ({
  onChange: (keys: Key[], rows: any[]) => {
    selectedRowKeys.value = keys;
    selectedRows.value = rows;
  },
  selectedRowKeys: selectedRowKeys.value,
}));

const columns = [
  {
    title: 'ID',
    dataIndex: 'uid',
    width: 50,
    sorter: true,
  },
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 60,
    customRender: ({ text }: any) => h(Avatar, { size: 32, src: text }),
  },
  { title: '用户名', dataIndex: 'username', width: 120 },
  { title: '手机号', dataIndex: 'mobile', width: 130 },
  {
    title: '头衔',
    dataIndex: 'tags',
    width: 130,
    customRender: ({ text }: any) => {
      if (!text || !Array.isArray(text) || text.length === 0) return '-';
      return h(Space, { size: 2, wrap: true }, () =>
        text.map((t: string) => h(Tag, { size: 'small' }, () => t)),
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    sorter: true,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'red' }, () => '封禁')
        : h(Tag, { color: 'green' }, () => '正常'),
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 170,
    sorter: true,
  },
  {
    title: '操作',
    width: 280,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleView(record.uid) },
          () => '查看',
        ),
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.uid) },
          () => '编辑',
        ),
        record.status === 1
          ? h(
              Button,
              { size: 'small', onClick: () => handleUnban(record.uid) },
              () => '解封',
            )
          : h(
              Button,
              {
                size: 'small',
                danger: true,
                onClick: () => openBanReasonModal([record.uid]),
              },
              () => '封禁',
            ),
        h(
          Popconfirm,
          { title: '确认删除?', onConfirm: () => handleDelete([record.uid]) },
          {
            default: () =>
              h(
                Button,
                { size: 'small', danger: true, type: 'dashed' },
                () => '删除',
              ),
          },
        ),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    };
    if (searchForm.value.key) params.key = searchForm.value.key;
    if (searchForm.value.status !== undefined)
      params.status = String(searchForm.value.status);
    // 时间范围
    let startTime = '';
    let endTime = '';
    if (searchForm.value.timeRange) {
      const now = dayjs();
      if (searchForm.value.timeRange === 'today') { startTime = now.startOf('day').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('day').format('YYYY-MM-DD HH:mm:ss'); }
      else if (searchForm.value.timeRange === 'week') { startTime = now.startOf('week').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('week').format('YYYY-MM-DD HH:mm:ss'); }
      else if (searchForm.value.timeRange === 'month') { startTime = now.startOf('month').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('month').format('YYYY-MM-DD HH:mm:ss'); }
    } else if (searchForm.value.dateRange?.length === 2) {
      startTime = dayjs(searchForm.value.dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      endTime = dayjs(searchForm.value.dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    }
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    const res = await getAppUserListApi(params);
    const data = res?.page;
    tableData.value = data?.list ?? [];
    total.value = data?.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(_p: any, _f: any, s: any) {
  if (s.order) {
    sortField.value = s.field;
    sortOrder.value = s.order === 'ascend' ? 'asc' : 'desc';
  } else {
    sortField.value = '';
    sortOrder.value = '';
  }
  loadData();
}

function onSearch() { page.value = 1; loadData(); }
function onClearSearch() {
  searchForm.value = { key: '', status: undefined, timeRange: '', dateRange: [] };
  page.value = 1; loadData();
}
function onTimeRangeChange() { searchForm.value.dateRange = []; }
function onDateRangeChange() { searchForm.value.timeRange = ''; onSearch(); }
function onPageChange(p: number, ps: number) { page.value = p; pageSize.value = ps; loadData(); }

async function handleView(uid: number) {
  try {
    const res = await getAppUserApi(uid);
    formData.value = res?.user ?? {};
  } catch { /* */ }
  modalVisible.value = true;
}

// ===== 编辑 =====
async function handleEdit(uid: number) {
  try {
    const res = await getAppUserApi(uid);
    editFormData.value = res?.user ?? {};
    editTags.value = res?.tags || editFormData.value.tags || editFormData.value.tagStr || [];
  } catch { /* */ }
  editTagInput.value = '';
  editingTagIndex.value = null;
  editingTagValue.value = '';
  editModalVisible.value = true;
}

async function handleSaveUserEdit() {
  if (editingTagIndex.value !== null) saveEditedTag();
  editSaving.value = true;
  try {
    const uid = editFormData.value.uid;
    await updateAppUserApi({
      uid,
      username: editFormData.value.username,
      mobile: editFormData.value.mobile,
      intro: editFormData.value.intro || '',
      tags: editTags.value || [],
    });
    message.success('保存成功');
    editModalVisible.value = false;
    loadData();
  } catch (err: any) {
    message.error(err?.message || '保存失败');
  } finally { editSaving.value = false; }
}

function addEditTag() {
  const val = editTagInput.value.trim();
  if (val && !editTags.value.includes(val)) editTags.value.push(val);
  editTagInput.value = '';
}
function removeEditTag(index: number) { editTags.value.splice(index, 1); }
function startEditTag(index: number) { editingTagIndex.value = index; editingTagValue.value = editTags.value[index]; }
function saveEditedTag() {
  if (editingTagIndex.value !== null) {
    const newValue = editingTagValue.value.trim();
    if (newValue && !editTags.value.includes(newValue)) editTags.value[editingTagIndex.value] = newValue;
    cancelEditTag();
  }
}
function cancelEditTag() { editingTagIndex.value = null; editingTagValue.value = ''; }

// ===== 封禁 =====
function openBanReasonModal(ids: number[]) { pendingBanIds.value = ids; banReason.value = ''; banReasonVisible.value = true; }
async function confirmBanWithReason() {
  if (!pendingBanIds.value.length) return;
  try {
    if (pendingBanIds.value.length === 1) {
      await banAppUserApi(pendingBanIds.value[0], banReason.value.trim() || undefined);
      message.success('已封禁');
    } else {
      await batchBanAppUserApi(pendingBanIds.value, banReason.value.trim() || undefined);
      message.success('批量封禁成功');
      selectedRowKeys.value = [];
    }
    loadData();
  } catch { /* */ } finally { banReasonVisible.value = false; pendingBanIds.value = []; banReason.value = ''; }
}
async function handleUnban(id: number) { try { await unbanAppUserApi(id); message.success('已解封'); loadData(); } catch { /* */ } }
async function handleDelete(ids: number[]) { try { await deleteAppUserApi(ids); message.success('删除成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }

function handleBatchBan() { if (!hasSelected.value) { message.warning('请先选择用户'); return; } openBanReasonModal(selectedRowKeys.value as number[]); }
function handleBatchUnban() {
  if (!hasSelected.value) { message.warning('请先选择用户'); return; }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({ content: `确认解除封禁选中的 ${ids.length} 个用户吗？`, title: '批量解封', onOk: async () => { try { await batchUnbanAppUserApi(ids); message.success('批量解封成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }});
}
function handleBatchDelete() {
  if (!hasSelected.value) { message.warning('请先选择用户'); return; }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({ content: `确认删除选中的 ${ids.length} 个用户吗？此操作不可恢复。`, title: '批量删除', okType: 'danger', okText: '确认删除', onOk: async () => { try { await deleteAppUserApi(ids); message.success('删除成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }});
}

loadData();
</script>

<template>
  <Page description="管理App端用户" title="用户管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="关键词">
          <Input v-model:value="searchForm.key" allow-clear placeholder="用户名/手机号" @clear="onSearch" @press-enter="onSearch" />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="searchForm.status" allow-clear placeholder="用户状态" style="width: 110px" @change="onSearch" @clear="onSearch">
            <Select.Option :value="0">正常</Select.Option>
            <Select.Option :value="1">封禁</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="注册时间">
          <Select v-model:value="searchForm.timeRange" allow-clear placeholder="全部时间" style="width: 110px" @change="onTimeRangeChange(); onSearch()" @clear="onTimeRangeChange(); onSearch()">
            <Select.Option value="today">今天</Select.Option>
            <Select.Option value="week">本周</Select.Option>
            <Select.Option value="month">本月</Select.Option>
          </Select>
          <DatePicker.RangePicker v-model:value="searchForm.dateRange" style="width: 240px" @change="onDateRangeChange" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="用户列表">
      <template #extra>
        <Space>
          <Button :disabled="!hasSelected" danger size="small" @click="handleBatchBan">批量封禁</Button>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchUnban">批量解封</Button>
          <Button :disabled="!hasSelected" danger size="small" type="dashed" @click="handleBatchDelete">批量删除</Button>
        </Space>
      </template>
      <Table :columns="columns" :data-source="tableData" :loading="loading" :pagination="false" :row-selection="rowSelection" row-key="uid" size="middle" :scroll="{ x: 1050 }" @change="handleTableChange" />
      <div class="mt-4 flex justify-end">
        <Pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-size-changer @change="onPageChange" />
      </div>
    </Card>

    <Modal v-model:open="modalVisible" title="用户详情" :footer="null">
      <div class="mb-4 flex justify-center">
        <Image v-if="formData.avatar" :src="formData.avatar" :width="64" :preview="true" :style="{ borderRadius: '50%', height: '64px', objectFit: 'cover' }" />
        <Avatar v-else :size="64" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ formData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">{{ formData.username }}</Descriptions.Item>
        <Descriptions.Item label="手机">{{ formData.mobile }}</Descriptions.Item>
        <Descriptions.Item label="状态">{{ formData.status === 1 ? '封禁' : '正常' }}</Descriptions.Item>
        <Descriptions.Item label="注册时间">{{ formData.createTime }}</Descriptions.Item>
      </Descriptions>
    </Modal>

    <!-- 编辑用户弹窗 -->
    <Modal v-model:open="editModalVisible" title="编辑用户" :footer="null" @cancel="editModalVisible = false">
      <div class="space-y-4">
        <div><div class="mb-1 text-sm text-gray-500">用户名</div><Input v-model:value="editFormData.username" /></div>
        <div><div class="mb-1 text-sm text-gray-500">手机号</div><Input v-model:value="editFormData.mobile" /></div>
        <div><div class="mb-1 text-sm text-gray-500">个性签名</div><Input.TextArea v-model:value="editFormData.intro" :rows="2" /></div>
        <div>
          <div class="mb-1 text-sm text-gray-500">头衔</div>
          <div class="mb-2 flex flex-wrap gap-1 items-center">
            <template v-for="(tag, index) in editTags" :key="index">
              <div v-if="editingTagIndex === index" class="flex gap-1 items-center">
                <Input v-model:value="editingTagValue" size="small" style="width: 120px" @pressEnter="saveEditedTag" @blur="saveEditedTag" />
                <Button size="small" type="primary" @click="saveEditedTag">保存</Button>
                <Button size="small" @click="cancelEditTag">取消</Button>
              </div>
              <Tag v-else closable @close="removeEditTag(index)">
                {{ tag }}
                <span class="ml-1 text-blue-500 cursor-pointer text-xs" @click.stop="startEditTag(index)">✎</span>
              </Tag>
            </template>
          </div>
          <div class="flex gap-2">
            <Input v-model:value="editTagInput" placeholder="输入新头衔" @pressEnter="addEditTag" />
            <Button @click="addEditTag">添加</Button>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t">
          <Button @click="editModalVisible = false">取消</Button>
          <Button type="primary" :loading="editSaving" @click="handleSaveUserEdit">保存</Button>
        </div>
      </div>
    </Modal>

    <!-- 封禁原因 -->
    <Modal v-model:open="banReasonVisible" title="填写封禁原因（可选）" :footer="null" @cancel="banReasonVisible = false">
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-500">请输入封禁原因（选填）：</div>
        <Input v-model:value="banReason" placeholder="例如：发布违规内容" :maxLength="100" show-count />
        <div class="mt-2 text-xs text-gray-400">原因将记录在用户资料中，解封时可查看历史。</div>
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button @click="banReasonVisible = false">取消</Button>
          <Button type="primary" @click="confirmBanWithReason">确认封禁</Button>
        </div>
      </div>
    </Modal>
  </Page>
</template>
