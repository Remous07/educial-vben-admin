<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
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
  deleteActivityApi,
  downActivityApi,
  getActivityApi,
  getActivityListApi,
  upActivityApi,
} from '#/api/modules/activity';

defineOptions({ name: 'ActivityManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({
  title: '',
  author: '',
  status: undefined as number | undefined,
  timeStatus: undefined as string | undefined,
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');
const selectedRows = ref<any[]>([]);

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
    dataIndex: 'id',
    width: 60,
    sorter: true,
  },
  { title: '活动标题', dataIndex: 'title', width: 180, ellipsis: true },
  {
    title: '发布人',
    width: 160,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Avatar, { size: 24, src: record?.userInfo?.avatar }),
        h('span', record?.userInfo?.username ?? ''),
      ]),
  },
  {
    title: '报名人数',
    dataIndex: 'currentRegCount',
    width: 90,
    sorter: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    sorter: true,
    customRender: ({ text }: any) => {
      return text === 0
        ? h(Tag, { color: 'default' }, () => '已取消')
        : h(Tag, { color: 'green' }, () => '正常');
    },
  },
  {
    title: '活动阶段',
    dataIndex: 'timeStatus',
    width: 100,
    customRender: ({ record }: any) => {
      const s = getTimeStatus(record);
      return h(Tag, { color: s.color }, () => s.label);
    },
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    width: 170,
    sorter: true,
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    width: 170,
    sorter: true,
  },
  {
    title: '操作',
    width: 260,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          {
            size: 'small',
            onClick: () => handleViewDetail(record.id),
          },
          () => '详情',
        ),
        record.status === 0
          ? h(
              Button,
              { size: 'small', onClick: () => handleUp([record.id]) },
              () => '上架',
            )
          : h(
              Button,
              { size: 'small', onClick: () => handleDown([record.id]) },
              () => '下架',
            ),
        h(
          Popconfirm,
          { title: '确认删除?', onConfirm: () => handleDelete([record.id]) },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
  },
];

function getTimeStatus(record: any): { color: string; label: string } {
  const now = new Date();
  const regStart = record.regStartTime ? new Date(record.regStartTime) : null;
  const regDeadline = record.regDeadline ? new Date(record.regDeadline) : null;
  const start = record.startTime ? new Date(record.startTime) : null;
  const end = record.endTime ? new Date(record.endTime) : null;

  if (regStart && now < regStart) return { color: 'blue', label: '筹备中' };
  if (regStart && regDeadline && now >= regStart && now <= regDeadline)
    return { color: 'cyan', label: '报名中' };
  if (regDeadline && start && now > regDeadline && now < start)
    return { color: 'orange', label: '即将开始' };
  if (start && end && now >= start && now <= end)
    return { color: 'processing', label: '进行中' };
  if (end && now > end) return { color: 'default', label: '已结束' };
  return { color: 'default', label: '-' };
}

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    };
    if (searchForm.value.title) params.title = searchForm.value.title;
    if (searchForm.value.author) params.author = searchForm.value.author;
    if (searchForm.value.status !== undefined)
      params.status = String(searchForm.value.status);
    if (searchForm.value.timeStatus)
      params.timeStatus = searchForm.value.timeStatus;
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    const res = await getActivityListApi(params);
    const data = res?.page;
    tableData.value = (data?.list ?? []).map((item: any) => ({
      ...item,
      timeStatus: getTimeStatus(item).label,
    }));
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
  searchForm.value.title = '';
  searchForm.value.author = '';
  searchForm.value.status = undefined;
  searchForm.value.timeStatus = undefined;
  page.value = 1;
  loadData();
}
function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteActivityApi(ids);
    message.success('删除成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

async function handleUp(ids: number[]) {
  try {
    await upActivityApi(ids);
    message.success('上架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

async function handleDown(ids: number[]) {
  try {
    await downActivityApi(ids);
    message.success('下架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

function handleBatchDelete() {
  if (!hasSelected.value) {
    message.warning('请先选择活动');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认删除选中的 ${ids.length} 个活动吗？此操作不可恢复。`,
    title: '批量删除',
    okType: 'danger',
    okText: '确认删除',
    onOk: async () => {
      await handleDelete(ids);
    },
  });
}

function handleBatchUp() {
  if (!hasSelected.value) {
    message.warning('请先选择活动');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认上架选中的 ${ids.length} 个活动吗？`,
    title: '批量上架',
    onOk: async () => {
      await handleUp(ids);
    },
  });
}

function handleBatchDown() {
  if (!hasSelected.value) {
    message.warning('请先选择活动');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认下架选中的 ${ids.length} 个活动吗？`,
    title: '批量下架',
    onOk: async () => {
      await handleDown(ids);
    },
  });
}

// --- 活动详情弹窗 ---
const detailModalVisible = ref(false);
const detailData = ref<Record<string, any>>({});

async function handleViewDetail(id: number) {
  try {
    const res = await getActivityApi(id);
    detailData.value = res?.activity ?? {};
  } catch {
    /* */
  }
  detailModalVisible.value = true;
}

loadData();
</script>

<template>
  <Page description="管理社区活动及报名" title="活动管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input
            v-model:value="searchForm.title"
            allow-clear
            placeholder="活动标题"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="发布人">
          <Input
            v-model:value="searchForm.author"
            allow-clear
            placeholder="发布人用户名"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="searchForm.status"
            allow-clear
            placeholder="活动状态"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="0">已取消</Select.Option>
            <Select.Option :value="1">正常</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="阶段">
          <Select
            v-model:value="searchForm.timeStatus"
            allow-clear
            placeholder="活动阶段"
            style="width: 120px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option value="preparing">筹备中</Select.Option>
            <Select.Option value="registering">报名中</Select.Option>
            <Select.Option value="upcoming">即将开始</Select.Option>
            <Select.Option value="ongoing">进行中</Select.Option>
            <Select.Option value="ended">已结束</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="活动列表">
      <template #extra>
        <Space>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchUp">
            批量上架
          </Button>
          <Button
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchDown"
          >
            批量下架
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
        </Space>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        :row-selection="rowSelection"
        row-key="id"
        size="middle"
        :scroll="{ x: 1300 }"
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

    <Modal
      v-model:open="detailModalVisible"
      :title="detailData.title || '活动详情'"
      :footer="null"
      width="700px"
    >
      <div class="flex flex-col gap-4">
        <!-- 发布人信息 -->
        <div class="flex items-center gap-3">
          <Avatar :size="40" :src="detailData.userInfo?.avatar" />
          <div>
            <div class="font-medium">
              {{ detailData.userInfo?.username ?? '-' }}
            </div>
            <div class="text-xs text-gray-400">{{ detailData.createTime }}</div>
          </div>
          <Tag
            :color="detailData.status === 0 ? 'default' : 'green'"
            class="ml-auto"
          >
            {{ detailData.status === 0 ? '已取消' : '正常' }}
          </Tag>
        </div>

        <!-- 封面图 -->
        <div v-if="detailData.coverImage" class="overflow-hidden rounded-lg">
          <Image
            :src="detailData.coverImage"
            class="w-full max-h-60 object-cover"
            :preview="true"
          />
        </div>

        <!-- 基本信息 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">基本信息</div>
          <div class="grid grid-cols-2 gap-3">
            <div class="detail-row">
              <strong>分类：</strong>{{ detailData.category || '-' }}
            </div>
            <div>
              <strong>主办方：</strong>{{ detailData.organizerName || '-' }}
            </div>
            <div>
              <strong>联系方式：</strong>{{ detailData.contact || '-' }}
            </div>
            <div><strong>地点：</strong>{{ detailData.location || '-' }}</div>
            <div>
              <strong>目标人群：</strong>{{ detailData.targetAudience || '-' }}
            </div>
            <div>
              <strong>报名人数：</strong>{{ detailData.currentRegCount ?? 0 }} /
              {{ detailData.maxParticipants || '不限' }}
            </div>
            <div><strong>浏览量：</strong>{{ detailData.readCount ?? 0 }}</div>
            <div>
              <strong>修改次数：</strong>{{ detailData.editCount ?? 0 }}
            </div>
          </div>
        </div>

        <!-- 时间信息 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">时间安排</div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <strong>报名开始：</strong>{{ detailData.regStartTime || '-' }}
            </div>
            <div>
              <strong>报名截止：</strong>{{ detailData.regDeadline || '-' }}
            </div>
            <div>
              <strong>活动开始：</strong>{{ detailData.startTime || '-' }}
            </div>
            <div>
              <strong>活动结束：</strong>{{ detailData.endTime || '-' }}
            </div>
          </div>
        </div>

        <!-- 简介 -->
        <div
          v-if="detailData.summary"
          class="rounded-lg detail-block p-4 text-sm"
        >
          <div class="detail-title">活动简介</div>
          <p>{{ detailData.summary }}</p>
        </div>

        <!-- 详情 -->
        <div
          v-if="detailData.detail"
          class="rounded-lg detail-block p-4 text-sm"
        >
          <div class="detail-title">活动详情</div>
          <div class="whitespace-pre-wrap break-words leading-relaxed">
            {{ detailData.detail }}
          </div>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.detail-block {
  background: var(--ant-color-bg-container);
  border: 2px solid var(--ant-color-border-secondary);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.detail-title {
  padding: 8px 12px;
  margin: -2px -2px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-primary-text);
  background: var(--ant-color-primary-bg);
  border-radius: 10px 10px 0 0;
}

.detail-row {
  color: var(--ant-color-text-secondary);
}

.detail-row strong {
  color: var(--ant-color-text);
}
</style>
