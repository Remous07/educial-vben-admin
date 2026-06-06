<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';

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
import dayjs from 'dayjs';

import { getAppUserApi } from '#/api/modules/app-user';
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
  timeRange: '' as '' | 'today' | 'week' | 'month',
  dateRange: [] as any[],
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');
const selectedRows = ref<any[]>([]);

// 下架原因输入
const downReasonVisible = ref(false);
const downReason = ref('');
const pendingDownIds = ref<number[]>([]);

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
        h('span', {
          style: { color: '#1890ff', cursor: 'pointer' },
          onClick: () => handleViewUser(record?.userInfo?.uid ?? record?.uid),
        }, record?.userInfo?.username ?? ''),
      ]),
  },
  {
    title: '报名人数',
    dataIndex: 'currentRegCount',
    width: 90,
    sorter: true,
  },
  {
    title: '编辑次数',
    dataIndex: 'editCount',
    width: 80,
    sorter: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    sorter: true,
    customRender: ({ text }: any) => {
      return text === 0
        ? h(Tag, { color: 'orange' }, () => '已下架')
        : h(Tag, { color: 'green' }, () => '正常');
    },
  },
  {
    title: '下架原因',
    dataIndex: 'rejectReason',
    width: 180,
    ellipsis: true,
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
    title: '创建时间',
    dataIndex: 'createTime',
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
              { size: 'small', onClick: () => openDownReasonModal([record.id]) },
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
  searchForm.value.timeRange = '';
  searchForm.value.dateRange = [];
  page.value = 1;
  loadData();
}

function onRefresh() {
  loadData();
}
function onTimeRangeChange() {
  searchForm.value.dateRange = [];
}
function onDateRangeChange() {
  searchForm.value.timeRange = '';
  onSearch();
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

async function handleDown(ids: number[], reason?: string) {
  try {
    await downActivityApi({ ids, reason: reason || undefined });
    message.success('下架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

function openDownReasonModal(ids: number[]) {
  pendingDownIds.value = ids;
  downReason.value = '';
  downReasonVisible.value = true;
}

async function confirmDownWithReason() {
  if (!pendingDownIds.value.length) return;
  await handleDown(pendingDownIds.value, downReason.value.trim() || undefined);
  downReasonVisible.value = false;
  pendingDownIds.value = [];
  downReason.value = '';
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
  openDownReasonModal(ids);
}

// --- 用户详情 ---
const userDetailVisible = ref(false);
const userDetailData = ref<Record<string, any>>({});
const userDetailTags = ref<string[]>([]);

async function handleViewUser(uid: number) {
  if (!uid) return;
  try {
    const res = await getAppUserApi(uid);
    userDetailData.value = res?.user ?? {};
    userDetailTags.value = res?.tags ?? [];
  } catch { /* */ }
  userDetailVisible.value = true;
}

// --- 活动详情弹窗 ---
const detailModalVisible = ref(false);
const detailData = ref<Record<string, any>>({});
const detailReviewReason = ref('');

async function handleViewDetail(id: number) {
  try {
    const res = await getActivityApi(id);
    detailData.value = res?.activity ?? {};
  } catch {
    /* */
  }
  detailReviewReason.value = '';
  detailModalVisible.value = true;
}

async function handleDetailUp() {
  try {
    await upActivityApi([detailData.value.id]);
    message.success('已上架');
    detailData.value.status = 1;
    detailReviewReason.value = '';
    loadData();
  } catch {
    /* */
  }
}

async function handleDetailDown() {
  try {
    const reason = detailReviewReason.value.trim() || undefined;
    await downActivityApi({ ids: [detailData.value.id], reason });
    message.success('已下架');
    detailData.value.status = 0;
    detailReviewReason.value = '';
    loadData();
  } catch {
    /* */
  }
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
            <Select.Option :value="0">已下架</Select.Option>
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
        <Form.Item label="创建时间">
          <Select
            v-model:value="searchForm.timeRange"
            allow-clear
            placeholder="全部时间"
            style="width: 110px"
            @change="onTimeRangeChange(); onSearch()"
            @clear="onTimeRangeChange(); onSearch()"
          >
            <Select.Option value="today">今天</Select.Option>
            <Select.Option value="week">本周</Select.Option>
            <Select.Option value="month">本月</Select.Option>
          </Select>
          <DatePicker.RangePicker
            v-model:value="searchForm.dateRange"
            style="width: 240px"
            @change="onDateRangeChange"
          />
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
      <div class="overflow-y-auto" style="max-height: 70vh">
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
            :color="detailData.status === 0 ? 'orange' : 'green'"
            class="ml-auto"
          >
            {{ detailData.status === 0 ? '已下架' : '正常' }}
          </Tag>
        </div>
        <div v-if="detailData.status === 0 && detailData.rejectReason" class="text-sm text-gray-600">
          <span class="text-gray-500">下架原因：</span>{{ detailData.rejectReason }}
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
              <strong>编辑次数：</strong>{{ detailData.editCount ?? 0 }}
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

        <!-- 审核操作 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">审核操作</div>
          <div class="space-y-3">
            <textarea
              v-model="detailReviewReason"
              placeholder="审核原因（选填），驳回时建议填写"
              rows="2"
              maxlength="200"
              class="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
            />
            <Space>
              <Popconfirm
                v-if="detailData.status === 0"
                title="确认通过该活动吗？"
                @confirm="handleDetailUp"
              >
                <Button type="primary"> 通过 </Button>
              </Popconfirm>
              <Popconfirm
                v-if="detailData.status === 1"
                title="确认驳回该活动吗？"
                @confirm="handleDetailDown"
              >
                <Button danger> 驳回 </Button>
              </Popconfirm>
              <span
                v-if="detailData.status !== 0 && detailData.status !== 1"
                class="text-xs text-gray-400"
              >
                当前状态无法操作
              </span>
            </Space>
            <div class="text-xs text-gray-400">
              提示：通过/驳回操作会更新对应内容的实际状态，并记录新的审核日志。
            </div>
          </div>
        </div>
      </div>
      </div>
    </Modal>

    <!-- 下架原因输入弹窗 -->
    <Modal
      v-model:open="downReasonVisible"
      title="填写下架原因（可选）"
      @ok="confirmDownWithReason"
      @cancel="downReasonVisible = false"
    >
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-500">请输入下架原因（选填）：</div>
        <Input
          v-model:value="downReason"
          placeholder="例如：活动信息虚假或含有违规内容"
          :maxLength="100"
          show-count
        />
        <div class="mt-2 text-xs text-gray-400">
          原因将记录到审核日志中，并在“我的已下架”列表中展示给发布者。
        </div>
      </div>
    </Modal>

    <!-- 用户详情弹窗 -->
    <Modal v-model:open="userDetailVisible" title="用户详情" :footer="null" width="480px">
      <div class="mb-4 flex justify-center">
        <Image v-if="userDetailData.avatar" :src="userDetailData.avatar" :width="64" :preview="true" :style="{ borderRadius: '50%', height: '64px', objectFit: 'cover' }" />
        <Avatar v-else :size="64" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ userDetailData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">{{ userDetailData.username }}</Descriptions.Item>
        <Descriptions.Item label="手机号">{{ userDetailData.mobile || '-' }}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag :color="userDetailData.status === 1 ? 'red' : 'green'">{{ userDetailData.status === 1 ? '已封禁' : '正常' }}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="积分"><Tag color="blue">{{ userDetailData.integral ?? 0 }}</Tag></Descriptions.Item>
        <Descriptions.Item label="头衔">
          <template v-if="userDetailTags.length">
            <Tag v-for="t in userDetailTags" :key="t" size="small" class="mr-1">{{ t }}</Tag>
          </template>
          <span v-else class="text-gray-400">-</span>
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">{{ userDetailData.createTime }}</Descriptions.Item>
      </Descriptions>
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
