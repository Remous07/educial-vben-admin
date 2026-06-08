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
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Switch,
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
import { getSmsConfigApi, saveSmsConfigApi } from '#/api/modules/moderation';
import { getIntegralConfigApi, type TitleTier } from '#/api/modules/integral';

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
  dateRange: [] as any[]   // for custom range picker
});
const sortField = ref('');
const sortOrder = ref('');
const modalVisible = ref(false);
const formData = ref<Record<string, any>>({});
const selectedRowKeys = ref<Key[]>([]);
const selectedRows = ref<any[]>([]);

// 封禁原因填写
const banReasonVisible = ref(false);
const banReason = ref('');
const pendingBanIds = ref<number[]>([]);

// 编辑用户（含头衔）
const editModalVisible = ref(false);
const editFormData = ref<Record<string, any>>({});
const editTags = ref<string[]>([]);
const editSaving = ref(false);
const editTagInput = ref('');
const titleTiers = ref<TitleTier[]>([]);
const editMatchedTitle = ref('');
const editMatchedTitleColor = ref<string | undefined>(undefined);

// 头衔颜色映射
const titleColorMap = ref<Record<string, string>>({});
function buildTitleColorMap(tiers?: TitleTier[]) {
  const map: Record<string, string> = {};
  for (const t of tiers || []) {
    if (t.color) map[t.title] = t.color;
  }
  titleColorMap.value = map;
}
function getTagColor(tag: string): string | undefined {
  return titleColorMap.value[tag];
}

// --- 短信配置 ---
const smsModalVisible = ref(false);
const smsConfig = ref({ secretId: '', secretKey: '', sdkAppId: '', signName: '', templateId: '', region: 'ap-guangzhou', dailyLimit: 10, enabled: false });
const smsConfigSaving = ref(false);

async function loadSmsConfig() {
  try {
    const res = await getSmsConfigApi();
    if (res?.smsConfig) smsConfig.value = res.smsConfig;
  } catch { /* */ }
}

async function handleSaveSmsConfig() {
  smsConfigSaving.value = true;
  try {
    await saveSmsConfigApi(smsConfig.value);
    message.success('短信配置已保存');
    await loadSmsConfig();
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    smsConfigSaving.value = false;
  }
}

function openSmsConfig() {
  loadSmsConfig();
  smsModalVisible.value = true;
}

// 用于头衔内联编辑
const editingTagIndex = ref<number | null>(null);
const editingTagValue = ref('');

const hasSelected = computed(() => selectedRowKeys.value.length > 0);

// 安全格式化时间（处理时间戳或字符串）
function formatTime(time: any) {
  if (!time) return '-';
  const d = dayjs(time);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-';
}

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
    title: '头衔',
    dataIndex: 'tags',
    width: 160,
    customRender: ({ text }: any) => {
      if (!text || !Array.isArray(text) || text.length === 0) return '-';
      const display = text.slice(0, 2);
      return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px' } }, [
        ...display.map((t: string) => h(Tag, { size: 'small', color: getTagColor(t) }, () => t)),
        text.length > 2 ? h('span', { style: { fontSize: '12px', color: '#999' } }, `+${text.length - 2}`) : null,
      ]);
    },
  },
  {
    title: '积分',
    dataIndex: 'integral',
    width: 70,
    sorter: true,
    customRender: ({ text }: any) => h(Tag, { color: 'blue' }, () => text ?? 0),
  },
  {
    title: '封禁原因',
    dataIndex: 'banReason',
    width: 180,
    ellipsis: true,
  },
  {
    title: '注册时间',
    dataIndex: 'createTime',
    width: 170,
    sorter: true,
    customRender: ({ text }: any) => formatTime(text),
  },
  {
    title: '操作',
    width: 200,
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
                onClick: () => handleBan(record.uid),
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

    // 基本搜索
    if (searchForm.value.key) params.key = searchForm.value.key;
    if (searchForm.value.status !== undefined)
      params.status = String(searchForm.value.status);

    // 时间范围处理
    let startTime = '';
    let endTime = '';

    if (searchForm.value.timeRange) {
      const now = dayjs();
      if (searchForm.value.timeRange === 'today') {
        startTime = now.startOf('day').format('YYYY-MM-DD HH:mm:ss');
        endTime = now.endOf('day').format('YYYY-MM-DD HH:mm:ss');
      } else if (searchForm.value.timeRange === 'week') {
        startTime = now.startOf('week').format('YYYY-MM-DD HH:mm:ss');
        endTime = now.endOf('week').format('YYYY-MM-DD HH:mm:ss');
      } else if (searchForm.value.timeRange === 'month') {
        startTime = now.startOf('month').format('YYYY-MM-DD HH:mm:ss');
        endTime = now.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      }
    } else if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
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

function onSearch() {
  page.value = 1;
  loadData();
}

function onClearSearch() {
  searchForm.value = { 
    key: '', 
    status: undefined,
    timeRange: '',
    dateRange: []
  };
  page.value = 1;
  loadData();
}

function onTimeRangeChange() {
  searchForm.value.dateRange = [];
  onSearch();
}

function onDateRangeChange() {
  searchForm.value.timeRange = '';
  onSearch();
}

function onRefresh() {
  loadData();
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleView(uid: number) {
  try {
    const res = await getAppUserApi(uid);
    const user = res?.user ?? {};
    // 合并顶层的 tags（后端返回结构：{ user: {...}, tags: [...] }）
    user.tags = res?.tags || user.tags || user.tagStr || [];
    formData.value = user;
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleBan(id: number) {
  openBanReasonModal([id]);
}

function openBanReasonModal(ids: number[]) {
  pendingBanIds.value = ids;
  banReason.value = '';
  banReasonVisible.value = true;
}

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
  } catch {
    /* */
  } finally {
    banReasonVisible.value = false;
    pendingBanIds.value = [];
    banReason.value = '';
  }
}
async function handleUnban(id: number) {
  try {
    await unbanAppUserApi(id);
    message.success('已解封');
    loadData();
  } catch {
    /* */
  }
}
async function handleDelete(ids: number[]) {
  try {
    await deleteAppUserApi(ids);
    message.success('删除成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

// 编辑用户（头衔 + 管理员可改字段）
async function handleEdit(uid: number) {
  try {
    const [userRes, cfgRes] = await Promise.all([
      getAppUserApi(uid),
      getIntegralConfigApi(),
    ]);
    editFormData.value = userRes?.user ?? {};
    editTags.value = userRes?.tags || editFormData.value.tags || editFormData.value.tagStr || [];
    editTagInput.value = '';
    editingTagIndex.value = null;
    editingTagValue.value = '';

    // 加载头衔档位，计算当前积分匹配的头衔
    titleTiers.value = cfgRes?.integralConfig?.titles || [];
    buildTitleColorMap(titleTiers.value);
    updateTitlePreview();
  } catch {
    /* */
  }
  editModalVisible.value = true;
}

function updateTitlePreview() {
  const pts = editFormData.value.integral ?? 0;
  const tiers = titleTiers.value;
  if (!tiers || tiers.length === 0) { editMatchedTitle.value = ''; editMatchedTitleColor.value = undefined; return; }
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  for (const t of sorted) {
    if (pts >= t.min) { editMatchedTitle.value = t.title; editMatchedTitleColor.value = t.color; return; }
  }
  const fallback = sorted[sorted.length - 1];
  editMatchedTitle.value = fallback?.title || '';
  editMatchedTitleColor.value = fallback?.color;
}

async function handleSaveUserEdit() {
  // 先保存正在编辑的标签，避免丢失
  if (editingTagIndex.value !== null) saveEditedTag();
  editSaving.value = true;
  try {
    const uid = editFormData.value.uid;
    
    // 通过现有 update API 同时更新基本字段 + 头衔（tags）
    const updateData = {
      uid,
      username: editFormData.value.username,
      mobile: editFormData.value.mobile,
      intro: editFormData.value.intro || '',
      tags: editTags.value || [],
      integral: editFormData.value.integral,
    };
    await updateAppUserApi(updateData);
    
    message.success('保存成功');
    editModalVisible.value = false;
    loadData();
  } catch (err: any) {
    message.error(err?.message || '保存失败');
  } finally {
    editSaving.value = false;
  }
}

function addEditTag() {
  const val = editTagInput.value.trim();
  if (val && !editTags.value.includes(val)) {
    editTags.value.push(val);
  }
  editTagInput.value = '';
}

function removeEditTag(index: number) {
  editTags.value.splice(index, 1);
}

// 开始编辑某个头衔
function startEditTag(index: number) {
  editingTagIndex.value = index;
  editingTagValue.value = editTags.value[index];
}

// 保存编辑后的头衔
function saveEditedTag() {
  if (editingTagIndex.value !== null) {
    const newValue = editingTagValue.value.trim();
    if (newValue && !editTags.value.includes(newValue)) {
      editTags.value[editingTagIndex.value] = newValue;
    }
    cancelEditTag();
  }
}

function cancelEditTag() {
  editingTagIndex.value = null;
  editingTagValue.value = '';
}

function handleBatchBan() {
  if (!hasSelected.value) {
    message.warning('请先选择用户');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  openBanReasonModal(ids);
}

function handleBatchUnban() {
  if (!hasSelected.value) {
    message.warning('请先选择用户');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认解除封禁选中的 ${ids.length} 个用户吗？`,
    title: '批量解封',
    onOk: async () => {
      try {
        await batchUnbanAppUserApi(ids);
        message.success('批量解封成功');
        selectedRowKeys.value = [];
        loadData();
      } catch {
        /* */
      }
    },
  });
}

function handleBatchDelete() {
  if (!hasSelected.value) {
    message.warning('请先选择用户');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认删除选中的 ${ids.length} 个用户吗？此操作不可恢复。`,
    title: '批量删除',
    okType: 'danger',
    okText: '确认删除',
    onOk: async () => {
      try {
        await deleteAppUserApi(ids);
        message.success('删除成功');
        selectedRowKeys.value = [];
        loadData();
      } catch {
        /* */
      }
    },
  });
}

// 页面初始化时加载头衔颜色映射
(async () => {
  try {
    const res = await getIntegralConfigApi();
    const tiers = res?.integralConfig?.titles || [];
    titleTiers.value = tiers;
    buildTitleColorMap(tiers);
  } catch { /* */ }
})();

loadData();
</script>

<template>
  <Page description="管理App端用户" title="用户管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="关键词">
          <Input
            v-model:value="searchForm.key"
            allow-clear
            placeholder="用户名/手机号"
            @clear="onClearSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="searchForm.status"
            allow-clear
            placeholder="用户状态"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="0">正常</Select.Option>
            <Select.Option :value="1">封禁</Select.Option>
          </Select>
        </Form.Item>

        <!-- 注册时间筛选 -->
        <Form.Item label="注册时间">
          <div class="flex items-center gap-2">
            <Select
              v-model:value="searchForm.timeRange"
              allow-clear
              placeholder="快捷范围"
              style="width: 100px"
              @change="onTimeRangeChange"
            >
              <Select.Option value="today">今天</Select.Option>
              <Select.Option value="week">本周</Select.Option>
              <Select.Option value="month">本月</Select.Option>
            </Select>
            <DatePicker.RangePicker
              v-model:value="searchForm.dateRange"
              style="width: 240px"
              @change="onDateRangeChange"
              :allowClear="true"
            />
          </div>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
            <Button @click="onRefresh">刷新</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="用户列表">
      <template #extra>
        <Space>
          <Button
            :disabled="!hasSelected"
            danger
            size="small"
            @click="handleBatchBan"
          >
            批量封禁
          </Button>
          <Button
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchUnban"
          >
            批量解封
          </Button>
          <Button
            :disabled="!hasSelected"
            danger
            size="small"
            type="dashed"
            @click="handleBatchDelete"
          >
            批量删除
          </Button>
          <Button
            size="small"
            @click="openSmsConfig"
          >
            短信配置
          </Button>
        </Space>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        :row-selection="rowSelection"
        row-key="uid"
        size="middle"
        :scroll="{ x: 970 }"
        @change="handleTableChange"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          show-size-changer
          @change="onPageChange"
        />
      </div>
    </Card>

    <Modal v-model:open="modalVisible" title="用户详情" :footer="null">
      <div class="mb-4 flex justify-center">
        <Image
          v-if="formData.avatar"
          :src="formData.avatar"
          :width="64"
          :preview="true"
          :style="{ borderRadius: '50%', height: '64px', objectFit: 'cover' }"
        />
        <Avatar v-else :size="64" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ formData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">
          {{ formData.username }}
        </Descriptions.Item>
        <Descriptions.Item label="手机">
          {{ formData.mobile }}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag :color="formData.status === 1 ? 'red' : 'green'">
            {{ formData.status === 1 ? '封禁' : '正常' }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="积分">
          <Tag color="blue">{{ formData.integral ?? 0 }}</Tag>
        </Descriptions.Item>
        <Descriptions.Item v-if="formData.banReason" label="封禁原因（历史）">
          {{ formData.banReason }}
        </Descriptions.Item>
        <Descriptions.Item label="头衔">
          <div v-if="formData.tags && Array.isArray(formData.tags) && formData.tags.length > 0">
            <Tag v-for="tag in formData.tags" :key="tag" style="margin-right: 4px; margin-bottom: 4px">{{ tag }}</Tag>
          </div>
          <span v-else>-</span>
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">
          {{ formatTime(formData.createTime) }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>

    <!-- 封禁原因输入弹窗 -->
    <Modal
      v-model:open="banReasonVisible"
      title="填写封禁原因（可选）"
      @ok="confirmBanWithReason"
      @cancel="banReasonVisible = false"
    >
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-500">请输入封禁原因（选填）：</div>
        <Input
          v-model:value="banReason"
          placeholder="例如：发布违规内容"
          :maxLength="100"
          show-count
        />
        <div class="mt-2 text-xs text-gray-400">
          原因将记录在用户资料中，解封时可查看历史。
        </div>
      </div>
    </Modal>

    <!-- 编辑用户弹窗（含头衔） -->
    <Modal
      v-model:open="editModalVisible"
      title="编辑用户"
      :footer="null"
      @cancel="editModalVisible = false"
    >
      <div class="space-y-4">
        <div>
          <div class="mb-1 text-sm text-gray-500">用户名</div>
          <Input v-model:value="editFormData.username" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">手机号</div>
          <Input v-model:value="editFormData.mobile" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">个性签名</div>
          <Input.TextArea v-model:value="editFormData.intro" :rows="2" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">积分</div>
          <InputNumber
            v-model:value="editFormData.integral"
            :min="-99999"
            style="width: 200px"
            @change="updateTitlePreview"
          />
          <span
            v-if="editMatchedTitle"
            class="ml-3 text-sm"
          >
            匹配头衔：<Tag :color="editMatchedTitleColor" size="small">{{ editMatchedTitle }}</Tag>
          </span>
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">头衔（可添加、删除、修改）</div>
          <div class="mb-2 flex flex-wrap gap-1 items-center">
            <template v-for="(tag, index) in editTags" :key="index">
              <!-- 编辑模式 -->
              <div v-if="editingTagIndex === index" class="flex gap-1 items-center">
                <Input
                  v-model:value="editingTagValue"
                  size="small"
                  style="width: 120px"
                  @pressEnter="saveEditedTag"
                  @blur="saveEditedTag"
                />
                <Button size="small" type="primary" @click="saveEditedTag">保存</Button>
                <Button size="small" @click="cancelEditTag">取消</Button>
              </div>
              <!-- 展示模式 -->
              <Tag
                v-else
                closable
                @close="removeEditTag(index)"
              >
                {{ tag }}
                <span 
                  class="ml-1 text-blue-500 cursor-pointer text-xs" 
                  @click.stop="startEditTag(index)"
                >
                  ✎
                </span>
              </Tag>
            </template>
          </div>

          <!-- 添加新头衔 -->
          <div class="flex gap-2">
            <Input
              v-model:value="editTagInput"
              placeholder="输入新头衔后回车或点击添加"
              @pressEnter="addEditTag"
              style="flex: 1"
            />
            <Button @click="addEditTag">添加</Button>
          </div>
          <div class="mt-1 text-xs text-gray-400">
            点击头衔上的 ✎ 可修改，点击关闭按钮删除
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button @click="editModalVisible = false">取消</Button>
          <Button type="primary" :loading="editSaving" @click="handleSaveUserEdit">
            保存
          </Button>
        </div>
      </div>
    </Modal>

    <!-- 短信配置弹窗 -->
    <Modal
      v-model:open="smsModalVisible"
      title="短信配置"
      width="520px"
      :footer="null"
      destroy-on-close
    >
      <div class="py-2 space-y-4">
        <div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <Switch v-model:checked="smsConfig.enabled" />
          <div>
            <div class="text-sm font-medium">{{ smsConfig.enabled ? '真实短信模式' : '测试验证码模式' }}</div>
            <div class="text-xs text-gray-400">
              {{ smsConfig.enabled ? '通过腾讯云发送真实短信（需先在 application.yml 中设置 sms.open: true）' : '验证码明文返回，无需配置短信服务即可登录注册' }}
            </div>
          </div>
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">SecretId</div>
          <Input v-model:value="smsConfig.secretId" placeholder="腾讯云 SecretId" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">SecretKey</div>
          <Input.Password
            v-model:value="smsConfig.secretKey"
            placeholder="腾讯云 SecretKey"
          />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">SDK AppID</div>
          <Input v-model:value="smsConfig.sdkAppId" placeholder="短信应用 SDK AppID" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">短信签名</div>
          <Input v-model:value="smsConfig.signName" placeholder="例如：教育平台" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">模板 ID</div>
          <Input v-model:value="smsConfig.templateId" placeholder="短信模板 ID" />
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">区域</div>
          <Input v-model:value="smsConfig.region" placeholder="ap-guangzhou" />
          <div class="mt-1 text-xs text-gray-400">腾讯云 SMS 服务区域，默认 ap-guangzhou</div>
        </div>
        <div>
          <div class="mb-1 text-sm text-gray-500">每日发送上限</div>
          <InputNumber v-model:value="smsConfig.dailyLimit" :min="1" :max="100" style="width: 160px" />
          <span class="ml-2 text-xs text-gray-400">每个手机号每天最多可请求的短信条数，默认 10</span>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <Button @click="smsModalVisible = false">取消</Button>
          <Button type="primary" :loading="smsConfigSaving" @click="handleSaveSmsConfig">
            保存
          </Button>
        </div>
      </div>
    </Modal>
  </Page>
</template>
