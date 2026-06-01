<script lang="ts" setup>
import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import dayjs from 'dayjs';

import {
  getAppUserListApi,
  updateAppUserApi,
} from '#/api/modules/app-user';
import {
  adjustUserIntegralApi,
  getIntegralConfigApi,
  getUserIntegralLogApi,
  saveIntegralConfigApi,
  setUserIntegralApi,
  type IntegralConfig,
  type TitleTier,
} from '#/api/modules/integral';

defineOptions({ name: 'IntegralManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({
  keyword: '',
  minIntegral: undefined as number | undefined,
  maxIntegral: undefined as number | undefined,
  frozenStatus: undefined as number | undefined, // 0=正常 1=已冻结
});
const sortField = ref('');
const sortOrder = ref('');

// 行内编辑状态
const editingUid = ref<number | null>(null);
const editingValue = ref<number>(0);

// 积分类型中文映射
const logTypeMap: Record<string, string> = {
  post_create: '发布帖子',
  comment_create: '发布评论',
  post_liked: '帖子被赞',
  post_favorited: '帖子被收藏',
  comment_liked: '评论被赞',
  admin_adjust: '管理员调整',
};

function getLogTypeLabel(type: string) {
  return logTypeMap[type] || type || '-';
}

const columns = computed(() => [
  {
    title: 'UID',
    dataIndex: 'uid',
    width: 70,
    sorter: true,
  },
  {
    title: '用户',
    width: 160,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Avatar, { size: 28, src: record?.avatar }),
        h('span', record?.username ?? '-'),
      ]),
  },
  {
    title: '头衔',
    dataIndex: 'tags',
    width: 140,
    customRender: ({ text }: any) => {
      if (!text || !Array.isArray(text) || text.length === 0) return '-';
      return h(Space, { size: 2, wrap: true }, () =>
        text.slice(0, 3).map((t: string) => h(Tag, { size: 'small' }, () => t)),
      );
    },
  },
  {
    title: '当前积分',
    dataIndex: 'integral',
    width: 140,
    sorter: true,
    customRender: ({ text, record }: any) => {
      if (editingUid.value === record.uid) {
        // 行内编辑状态
        return h('div', { class: 'flex items-center gap-1' }, [
          h(InputNumber, {
            value: editingValue.value,
            min: 0,
            style: { width: '90px' },
            onChange: (val: number) => { editingValue.value = val ?? 0; }
          }),
          h(Button, {
            size: 'small',
            type: 'primary',
            onClick: () => saveInlineEdit(record)
          }, () => '保存'),
          h(Button, {
            size: 'small',
            onClick: () => cancelInlineEdit()
          }, () => '取消'),
        ]);
      }
      // 普通显示 + 编辑按钮
      return h('div', { class: 'flex items-center gap-2' }, [
        h(Tag, { color: 'blue' }, () => text ?? 0),
        h(Button, {
          size: 'small',
          onClick: () => startInlineEdit(record)
        }, () => '编辑'),
      ]);
    },
  },
  {
    title: '积分状态',
    dataIndex: 'integralFrozen',
    width: 100,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'orange' }, () => '已冻结')
        : h(Tag, { color: 'green' }, () => '正常'),
  },
  {
    title: '操作',
    width: 220,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          {
            size: 'small',
            onClick: () => openAdjustModal(record),
          },
          () => '调整',
        ),
        h(
          Button,
          {
            size: 'small',
            onClick: () => openLogDrawer(record),
          },
          () => '流水',
        ),
        record.integralFrozen === 1
          ? h(
              Button,
              {
                size: 'small',
                onClick: () => handleToggleFreeze(record, 0),
              },
              () => '解冻',
            )
          : h(
              Button,
              {
                size: 'small',
                danger: true,
                onClick: () => handleToggleFreeze(record, 1),
              },
              () => '冻结',
            ),
      ]),
  },
]);

const logColumns = [
  {
    title: '时间',
    dataIndex: 'createTime',
    width: 170,
    customRender: ({ text }: any) => (text ? new Date(text).toLocaleString() : '-'),
  },
  {
    title: '变动',
    dataIndex: 'amount',
    width: 80,
    customRender: ({ text }: any) =>
      h(Tag, { color: text > 0 ? 'green' : 'red' }, () => `${text > 0 ? '+' : ''}${text}`),
  },
  {
    title: '类型',
    dataIndex: 'type',
    width: 120,
    customRender: ({ text }: any) => getLogTypeLabel(text),
  },
  {
    title: '原因',
    dataIndex: 'reason',
    ellipsis: true,
  },
];

// ==================== 数据加载 ====================
async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    };
    if (searchForm.value.keyword) params.keyword = searchForm.value.keyword; // 后端支持用户名/手机号模糊
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    const res = await getAppUserListApi(params);
    let list = res?.page?.list ?? [];

    // 客户端二次过滤（积分范围 + 冻结状态）
    if (
      searchForm.value.minIntegral !== undefined ||
      searchForm.value.maxIntegral !== undefined ||
      searchForm.value.frozenStatus !== undefined
    ) {
      list = list.filter((u: any) => {
        const integral = u.integral ?? 0;
        const frozen = u.integralFrozen ?? 0;

        if (searchForm.value.minIntegral !== undefined && integral < searchForm.value.minIntegral) return false;
        if (searchForm.value.maxIntegral !== undefined && integral > searchForm.value.maxIntegral) return false;
        if (searchForm.value.frozenStatus !== undefined && frozen !== searchForm.value.frozenStatus) return false;

        return true;
      });
    }

    tableData.value = list;
    total.value = res?.page?.totalCount ?? list.length;
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
    keyword: '',
    minIntegral: undefined,
    maxIntegral: undefined,
    frozenStatus: undefined,
  };
  page.value = 1;
  loadData();
}

function onRefresh() {
  loadData();
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}



// ==================== 调整积分 ====================
const adjustVisible = ref(false);
const adjustLoading = ref(false);
const adjustingUser = ref<any>(null);
const targetPoints = ref<number>(0);
const adjustReason = ref('');

function openAdjustModal(record: any) {
  adjustingUser.value = record;
  // 默认设置为当前积分，方便管理员直接修改
  targetPoints.value = record.integral ?? 0;
  adjustReason.value = '';
  adjustVisible.value = true;
}

function applyQuickAdjust(delta: number) {
  const current = adjustingUser.value?.integral ?? 0;
  targetPoints.value = Math.max(0, current + delta);
}

// ==================== 行内编辑积分 ====================
function startInlineEdit(record: any) {
  editingUid.value = record.uid;
  editingValue.value = record.integral ?? 0;
}

function cancelInlineEdit() {
  editingUid.value = null;
  editingValue.value = 0;
}

async function saveInlineEdit(record: any) {
  if (editingValue.value < 0) {
    message.warning('积分不能为负');
    return;
  }

  const reason = prompt('请输入调整原因（必填）');
  if (!reason || !reason.trim()) {
    message.warning('调整原因不能为空');
    return;
  }

  try {
    await setUserIntegralApi({
      uid: record.uid,
      targetValue: editingValue.value,
      reason: reason.trim(),
    });
    message.success('积分修改成功');
    cancelInlineEdit();
    loadData();
  } catch {
    /* */
  }
}

async function confirmAdjust() {
  if (!adjustingUser.value) return;
  if (!adjustReason.value.trim()) {
    message.warning('请填写调整原因');
    return;
  }

  const current = adjustingUser.value.integral ?? 0;
  const delta = targetPoints.value - current;

  if (delta === 0) {
    message.warning('积分值未发生变化');
    return;
  }

  adjustLoading.value = true;
  try {
    await setUserIntegralApi({
      uid: adjustingUser.value.uid,
      targetValue: targetPoints.value,
      reason: adjustReason.value.trim(),
    });
    message.success('积分设置成功');
    adjustVisible.value = false;
    loadData();
  } catch {
    /* error handled by request interceptor */
  } finally {
    adjustLoading.value = false;
  }
}

// ==================== 查看流水 Drawer ====================
const logDrawerVisible = ref(false);
const logLoading = ref(false);
const logUser = ref<any>(null);
const logList = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(10);
const logTimeRange = ref(''); // '', 'today', 'week', 'month'
const logCustomRange = ref<any[]>([]); // [startDate, endDate] for custom range picker

async function openLogDrawer(record: any) {
  logUser.value = record;
  logPage.value = 1;
  logTimeRange.value = '';
  logCustomRange.value = [];
  logDrawerVisible.value = true;
  await loadUserLogs();
}

async function loadUserLogs() {
  if (!logUser.value) return;
  logLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: logPage.value,
      limit: logPageSize.value,
    };

    if (logTimeRange.value) {
      // 快捷范围
      params.timeRange = logTimeRange.value;
    } else if (logCustomRange.value && logCustomRange.value.length === 2) {
      // 自定义时间范围
      params.startTime = dayjs(logCustomRange.value[0]).format('YYYY-MM-DD 00:00:00');
      params.endTime = dayjs(logCustomRange.value[1]).format('YYYY-MM-DD 23:59:59');
    }

    const res = await getUserIntegralLogApi(logUser.value.uid, params);
    logList.value = res?.page?.list ?? [];
    logTotal.value = res?.page?.totalCount ?? 0;
  } finally {
    logLoading.value = false;
  }
}

function onLogPageChange(p: number, ps: number) {
  logPage.value = p;
  logPageSize.value = ps;
  loadUserLogs();
}

function onLogTimeRangeChange() {
  logPage.value = 1;
  logCustomRange.value = []; // 清空自定义范围
  loadUserLogs();
}

function onLogCustomRangeChange(dates: any) {
  logPage.value = 1;
  logTimeRange.value = ''; // 清空快捷范围
  loadUserLogs();
}

// ==================== 冻结 / 解冻 ====================
async function handleToggleFreeze(record: any, targetFrozen: number) {
  const action = targetFrozen === 1 ? '冻结' : '解冻';
  Modal.confirm({
    title: `确认${action}该用户积分获取？`,
    content: targetFrozen === 1
      ? '冻结后该用户将无法通过日常操作获得积分（管理员调整仍生效）。'
      : '解冻后用户可正常获取积分。',
    okText: `确认${action}`,
    okType: targetFrozen === 1 ? 'danger' : 'primary',
    async onOk() {
      try {
        await updateAppUserApi({
          uid: record.uid,
          integralFrozen: targetFrozen,
        });
        message.success(`${action}成功`);
        loadData();
      } catch {
        /* */
      }
    },
  });
}

// ==================== 积分规则配置 ====================
const configVisible = ref(false);
const configLoading = ref(false);
const configForm = ref<Partial<IntegralConfig>>({});

async function openConfigModal() {
  configLoading.value = true;
  try {
    const res = await getIntegralConfigApi();
    const cfg = res?.integralConfig ?? {};
    configForm.value = { ...cfg };
    configVisible.value = true;
  } catch {
    /* */
  } finally {
    configLoading.value = false;
  }
}

async function saveConfig() {
  const submitted = { ...configForm.value };

  configLoading.value = true;
  try {
    await saveIntegralConfigApi(submitted as IntegralConfig);

    // 重新拉取验证
    const fresh = await getIntegralConfigApi();
    const server = fresh?.integralConfig ?? {};

    // 简单深度对比关键字段
    const keys: (keyof IntegralConfig)[] = [
      'postCreate', 'commentCreate', 'postLiked', 'postFavorited', 'commentLiked',
      'dailyPostLimit', 'dailyCommentLimit', 'dailyTotalLimit',
    ];
    const mismatch = keys.some(k => submitted[k] !== server[k]);

    if (mismatch) {
      message.warning('配置已保存，但服务端返回与提交值存在差异，请检查');
    } else {
      message.success('积分规则配置保存成功');
    }
    configVisible.value = false;
  } catch {
    /* */
  } finally {
    configLoading.value = false;
  }
}

// ==================== 头衔档位管理 ====================
const tierVisible = ref(false);
const tierSaving = ref(false);
const tierForm = ref<TitleTier[]>([]);

async function openTierModal() {
  configLoading.value = true;
  try {
    const res = await getIntegralConfigApi();
    configForm.value = res?.integralConfig ?? {};
    tierForm.value = (configForm.value.titles || []).map((t: TitleTier) => ({ ...t }));
  } catch {
    /* */
  } finally {
    configLoading.value = false;
  }
  tierVisible.value = true;
}

async function saveTiers() {
  // 按 min 从高到低排序
  tierForm.value.sort((a, b) => b.min - a.min);
  tierSaving.value = true;
  try {
    const payload = { ...configForm.value, titles: tierForm.value };
    await saveIntegralConfigApi(payload as IntegralConfig);
    configForm.value.titles = [...tierForm.value];
    message.success('头衔档位已保存');
    tierVisible.value = false;
  } catch {
    /* */
  } finally {
    tierSaving.value = false;
  }
}

function addTier() {
  tierForm.value.push({ title: '', min: 0 });
}

function removeTier(index: number) {
  tierForm.value.splice(index, 1);
}

loadData();
</script>

<template>
  <Page description="管理用户积分余额、冻结状态及系统发放规则" title="积分管理">
    <!-- 筛选 -->
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="用户">
          <Input
            v-model:value="searchForm.keyword"
            allow-clear
            placeholder="用户名 / 手机号"
            style="width: 180px"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="积分范围">
          <InputNumber
            v-model:value="searchForm.minIntegral"
            :min="0"
            placeholder="最小"
            style="width: 100px"
            @change="onSearch"
          />
          <span class="mx-1">-</span>
          <InputNumber
            v-model:value="searchForm.maxIntegral"
            :min="0"
            placeholder="最大"
            style="width: 100px"
            @change="onSearch"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="searchForm.frozenStatus"
            allow-clear
            placeholder="积分状态"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="0">正常</Select.Option>
            <Select.Option :value="1">已冻结</Select.Option>
          </Select>
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

    <!-- 主列表 -->
    <Card title="用户积分列表">
      <template #extra>
        <Space>
          <Button size="small" @click="openConfigModal">
            积分规则配置
          </Button>
          <Button size="small" @click="openTierModal">
            头衔档位管理
          </Button>
          <Button size="small" @click="onRefresh">刷新</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="uid"
        size="middle"
        :scroll="{ x: 1050 }"
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

    <!-- 调整积分弹窗 -->
    <Modal
      v-model:open="adjustVisible"
      title="设置用户积分"
      :footer="null"
      @cancel="adjustVisible = false"
    >
      <div class="py-2 space-y-4">
        <div>
          <div class="text-sm text-gray-500 mb-1">用户</div>
          <div class="flex items-center gap-2">
            <Avatar :size="32" :src="adjustingUser?.avatar" />
            <span class="font-medium">{{ adjustingUser?.username }}</span>
            <span class="text-gray-400">(UID: {{ adjustingUser?.uid }})</span>
          </div>
        </div>

        <div>
          <div class="text-sm text-gray-500 mb-1">当前积分</div>
          <Tag color="blue" style=" padding: 2px 12px;font-size: 16px;">
            {{ adjustingUser?.integral ?? 0 }}
          </Tag>
        </div>

        <div>
          <div class="text-sm text-gray-500 mb-1">快捷操作</div>
          <div class="flex flex-wrap gap-2 mb-2">
            <Button size="small" @click="applyQuickAdjust(0)">清零</Button>
            <Button size="small" @click="applyQuickAdjust(-100)">-100</Button>
            <Button size="small" @click="applyQuickAdjust(-500)">-500</Button>
            <Button size="small" @click="applyQuickAdjust(100)">+100</Button>
            <Button size="small" @click="applyQuickAdjust(500)">+500</Button>
            <Button size="small" @click="applyQuickAdjust(1000)">+1000</Button>
          </div>

          <div class="text-sm text-gray-500 mb-1">设置积分值为</div>
          <InputNumber
            v-model:value="targetPoints"
            :min="0"
            style="width: 200px"
            placeholder="直接输入目标积分值"
          />
          <div class="mt-1 text-xs">
            <span class="text-gray-500">本次变动：</span>
            <Tag :color="targetPoints - (adjustingUser?.integral ?? 0) >= 0 ? 'green' : 'red'">
              {{ (targetPoints - (adjustingUser?.integral ?? 0) >= 0 ? '+' : '') + (targetPoints - (adjustingUser?.integral ?? 0)) }}
            </Tag>
          </div>
        </div>

        <div>
          <div class="text-sm text-gray-500 mb-1">调整原因 <span class="text-red-500">*</span></div>
          <Input.TextArea
            v-model:value="adjustReason"
            :rows="3"
            placeholder="例如：运营活动奖励 / 违规内容扣分 / 申诉补偿"
            :max-length="200"
            show-count
          />
        </div>

        <div class="text-xs text-gray-400">
          提示：直接设置目标积分值，系统会自动计算变动数量并记录到流水中。
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t">
          <Button @click="adjustVisible = false">取消</Button>
          <Button type="primary" :loading="adjustLoading" @click="confirmAdjust">确认设置</Button>
        </div>
      </div>
    </Modal>

    <!-- 积分流水 -->
    <Modal
      v-model:open="logDrawerVisible"
      :title="`积分流水 - ${logUser?.username ?? ''}`"
      width="720px"
      :footer="null"
    >
      <div v-if="logUser" class="mb-3 text-sm text-gray-500">
        当前积分：<Tag color="blue">{{ logUser.integral ?? 0 }}</Tag>
      </div>

      <!-- 时间范围筛选 -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm text-gray-500">快捷范围：</span>
          <Select
            v-model:value="logTimeRange"
            style="width: 120px"
            @change="onLogTimeRangeChange"
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="today">今天</Select.Option>
            <Select.Option value="week">本周</Select.Option>
            <Select.Option value="month">本月</Select.Option>
          </Select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">自定义范围：</span>
          <DatePicker.RangePicker
            v-model:value="logCustomRange"
            style="width: 260px"
            @change="onLogCustomRangeChange"
            :allowClear="true"
          />
        </div>
      </div>

      <Table
        :columns="logColumns"
        :data-source="logList"
        :loading="logLoading"
        :pagination="false"
        size="small"
        row-key="id"
      />

      <div class="mt-3 flex justify-end">
        <Pagination
          v-model:current="logPage"
          v-model:page-size="logPageSize"
          :total="logTotal"
          size="small"
          @change="onLogPageChange"
        />
      </div>
    </Modal>

    <!-- 积分规则配置弹窗 -->
    <Modal
      v-model:open="configVisible"
      title="积分规则配置"
      width="620px"
      :footer="null"
      @cancel="configVisible = false"
    >
      <div class="space-y-6 py-2">
        <!-- 发放规则 -->
        <div>
          <div class="font-semibold mb-3 text-base">发放积分值</div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div class="text-sm text-gray-500 mb-1">发布帖子</div>
              <InputNumber v-model:value="configForm.postCreate" :min="0" />
            </div>
            <div>
              <div class="text-sm text-gray-500 mb-1">发布评论</div>
              <InputNumber v-model:value="configForm.commentCreate" :min="0" />
            </div>
            <div>
              <div class="text-sm text-gray-500 mb-1">帖子被点赞</div>
              <InputNumber v-model:value="configForm.postLiked" :min="0" />
            </div>
            <div>
              <div class="text-sm text-gray-500 mb-1">帖子被收藏</div>
              <InputNumber v-model:value="configForm.postFavorited" :min="0" />
            </div>
            <div>
              <div class="text-sm text-gray-500 mb-1">评论被点赞</div>
              <InputNumber v-model:value="configForm.commentLiked" :min="0" />
            </div>
          </div>
        </div>

        <!-- 限制规则 -->
        <div>
          <div class="font-semibold mb-3 text-base">每日限制</div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div class="text-sm text-gray-500 mb-1">每日发帖上限（0=不限）</div>
              <InputNumber v-model:value="configForm.dailyPostLimit" :min="0" />
            </div>
            <div>
              <div class="text-sm text-gray-500 mb-1">每日评论上限（0=不限）</div>
              <InputNumber v-model:value="configForm.dailyCommentLimit" :min="0" />
            </div>
            <div class="col-span-2">
              <div class="text-sm text-gray-500 mb-1">每日总积分上限（0=不限）</div>
              <InputNumber v-model:value="configForm.dailyTotalLimit" :min="0" style="width: 200px" />
              <div class="text-xs text-gray-400 mt-1">限制用户每天通过系统操作获得的积分总量（管理员调整不受影响）</div>
            </div>
          </div>
        </div>

        <!-- 全局冻结 -->
        <div>
          <div class="font-semibold mb-3 text-base text-red-600">全局控制</div>
          <div class="flex items-center gap-3">
            <span class="text-sm">全局冻结所有人积分收益</span>
            <Switch
              v-model:checked="configForm.globalFrozen"
              checked-children="已冻结"
              un-checked-children="正常"
            />
            <span class="text-xs text-gray-400">开启后，所有用户将无法通过日常操作获得积分（管理员调整仍生效）</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="text-xs text-gray-400 mb-3 text-left">
          修改后立即生效，影响后续积分发放。
        </div>
        <Space>
          <Button @click="configVisible = false">取消</Button>
          <Button type="primary" :loading="configLoading" @click="saveConfig">保存配置</Button>
        </Space>
      </template>
    </Modal>

    <!-- 头衔档位管理弹窗 -->
    <Modal
      v-model:open="tierVisible"
      title="头衔档位管理"
      width="560px"
      :footer="null"
      @cancel="tierVisible = false"
    >
      <div class="space-y-3">
        <div class="text-xs text-gray-400">
          头衔按积分从高到低匹配，积分达到对应分数线自动更换。修改后已拥有头衔的用户在下次积分变动时自动更新。
        </div>
        <div
          v-for="(tier, index) in tierForm"
          :key="index"
          class="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
        >
          <span class="text-xs text-gray-400 w-6">{{ index + 1 }}</span>
          <Input
            v-model:value="tier.title"
            placeholder="头衔名称"
            style="width: 160px"
          />
          <div class="flex items-center gap-1">
            <span class="text-sm text-gray-500">≥</span>
            <InputNumber
              v-model:value="tier.min"
              :min="0"
              placeholder="分数线"
              style="width: 100px"
            />
          </div>
          <Button size="small" danger @click="removeTier(index)">删除</Button>
        </div>
        <Button dashed block @click="addTier">+ 新增档位</Button>
        <div class="flex justify-end gap-2 pt-3 border-t">
          <Button @click="tierVisible = false">取消</Button>
          <Button type="primary" :loading="tierSaving" @click="saveTiers">保存档位</Button>
        </div>
      </div>
    </Modal>
  </Page>
</template>
