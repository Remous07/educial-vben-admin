<script lang="ts" setup>
import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
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
  getAppUserApi,
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

// 积分类型中文映射（覆盖所有 grant/deduct 调用 + 管理操作）
const logTypeMap: Record<string, string> = {
  post_create: '发布帖子',
  comment_create: '发布评论',
  post_liked: '帖子被点赞',
  post_unliked: '帖子点赞被取消',
  post_favorited: '帖子被收藏',
  post_unfavorited: '帖子收藏被取消',
  comment_liked: '评论被点赞',
  comment_unliked: '评论点赞被取消',
  admin_adjust: '管理员调整',
  moderation_reject: '审核不通过扣分',
};

function getLogTypeLabel(type: string) {
  return logTypeMap[type] || type || '-';
}

// 从档位配置中查找头衔对应的颜色
const titleColorMap = ref<Record<string, string>>({});
function buildTitleColorMap(titles?: TitleTier[]) {
  const map: Record<string, string> = {};
  for (const t of titles || []) {
    if (t.color) map[t.title] = t.color;
  }
  titleColorMap.value = map;
}
function getTagColor(tag: string): string | undefined {
  return titleColorMap.value[tag];
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
        h('span', {
          style: { color: '#1890ff', cursor: 'pointer' },
          onClick: () => handleViewUser(record?.uid),
        }, record?.username ?? '-'),
      ]),
  },
  {
    title: '头衔',
    dataIndex: 'tags',
    width: 160,
    customRender: ({ text }: any) => {
      if (!text || !Array.isArray(text) || text.length === 0) return '-';
      return h(Space, { size: 2, wrap: true }, () =>
        text.slice(0, 3).map((t: string) => h(Tag, { size: 'small', color: getTagColor(t) }, () => t)),
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
            style: { width: '90px' },
            // 支持负积分
            onChange: (val: any) => { editingValue.value = val ?? 0; }
          } as any),
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
    // 匹配后端 queryPage 的 key 参数（用户名/手机号模糊搜索），注意不是 keyword
    if (searchForm.value.keyword) params.key = searchForm.value.keyword;
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    // 透传积分范围和冻结状态到后端（已支持服务端过滤 + 分页）
    if (searchForm.value.minIntegral !== undefined) params.minIntegral = String(searchForm.value.minIntegral);
    if (searchForm.value.maxIntegral !== undefined) params.maxIntegral = String(searchForm.value.maxIntegral);
    if (searchForm.value.frozenStatus !== undefined) params.integralFrozen = String(searchForm.value.frozenStatus);

    const res = await getAppUserListApi(params);
    const list = res?.page?.list ?? [];

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

/**
 * 快捷 +/- 直接走相对调整接口（adjustUserIntegralApi）
 * 这会真正使用到相对调整端点
 */
async function quickAdjustByApi(delta: number) {
  if (!adjustingUser.value) return;

  const reason = prompt(`请输入调整原因（${delta > 0 ? '+' : ''}${delta} 分）`);
  if (reason === null) return; // 用户点击了取消
  if (!reason.trim()) {
    message.warning('调整原因不能为空');
    return;
  }

  try {
    await adjustUserIntegralApi({
      uid: adjustingUser.value.uid,
      amount: delta,
      reason: reason.trim(),
    });
    message.success(`已${delta > 0 ? '增加' : '扣除'} ${Math.abs(delta)} 分`);
    adjustVisible.value = false;
    loadData();
  } catch {
    /* error handled by interceptor */
  }
}

/** 清零：使用绝对设置接口将积分设为 0 */
async function quickClearIntegral() {
  if (!adjustingUser.value) return;

  const reason = prompt('请输入清零原因（必填）');
  if (reason === null) return; // 用户点击了取消
  if (!reason.trim()) {
    message.warning('清零原因不能为空');
    return;
  }

  try {
    await setUserIntegralApi({
      uid: adjustingUser.value.uid,
      targetValue: 0,
      reason: reason.trim(),
    });
    message.success('积分已清零');
    adjustVisible.value = false;
    loadData();
  } catch {
    /* error handled by interceptor */
  }
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
  // 允许负积分（对应头衔系统中的「问题用户」「违规禁用」等档位）
  if (editingValue.value <= -100_000) {
    message.warning('积分值过低，请确认是否输入错误');
    return;
  }

  const reason = prompt('请输入调整原因（必填）');
  if (reason === null) return; // 用户点击了取消
  if (!reason.trim()) {
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

function onLogCustomRangeChange() {
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

// ==================== 用户详情弹窗 ====================
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

// ==================== 积分规则配置 ====================
const configVisible = ref(false);
const configLoading = ref(false);
const configForm = ref<Partial<IntegralConfig>>({});

async function openConfigModal() {
  configLoading.value = true;
  try {
    const res = await getIntegralConfigApi();
    const cfg = res?.integralConfig ?? {};
    // 确保 boolean 字段有明确的默认值，避免 Switch 组件收到 undefined
    configForm.value = { globalFrozen: false, ...cfg };
    buildTitleColorMap(cfg.titles);
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
      'postRejectPenalty', 'commentRejectPenalty', 'activityRejectPenalty',
      'globalFrozen', 'manualRejectDeductEnabled', 'manualRejectAutoBanEnabled',
    ];
    // 使用 ?? 将 undefined 和 0/false 都规范化为 null，避免新字段 undefined vs 0 的误报
    const mismatch = keys.some(k => (submitted[k] ?? null) !== (server[k] ?? null));

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
  // 从后端拉取最新配置，确保获取到 titles
  try {
    const res = await getIntegralConfigApi();
    const cfg = res?.integralConfig ?? {};
    configForm.value = { ...configForm.value, ...cfg };
  } catch { /* */ }
  tierForm.value = (configForm.value.titles || []).map((t: TitleTier) => ({
    ...t,
    banFreezeIntegral: t.banFreezeIntegral ?? true,
  }));
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
    buildTitleColorMap(tierForm.value);
    message.success('头衔档位已保存');
    tierVisible.value = false;
  } catch {
    /* */
  } finally {
    tierSaving.value = false;
  }
}

function addTier() {
  tierForm.value.push({ title: '', min: 0, color: 'blue', banOnReach: false, banFreezeIntegral: true });
}

function removeTier(index: number) {
  tierForm.value.splice(index, 1);
}

// 页面初始化时加载头衔颜色映射
(async () => {
  try {
    const res = await getIntegralConfigApi();
    const cfg = res?.integralConfig ?? {};
    buildTitleColorMap(cfg.titles);
    configForm.value = { globalFrozen: false, ...cfg };
  } catch { /* */ }
})();

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
            placeholder="最小（支持负）"
            style="width: 100px"
            @change="onSearch"
          />
          <span class="mx-1">-</span>
          <InputNumber
            v-model:value="searchForm.maxIntegral"
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
      :confirm-loading="adjustLoading"
      @ok="confirmAdjust"
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
          <Tag color="blue" style="font-size: 16px; padding: 2px 12px;">
            {{ adjustingUser?.integral ?? 0 }}
          </Tag>
        </div>

        <div>
          <div class="text-sm text-gray-500 mb-1">快捷操作</div>
          <div class="flex flex-wrap gap-2 mb-2">
            <Button size="small" @click="quickClearIntegral">清零（设为 0）</Button>
            <Button size="small" @click="quickAdjustByApi(-100)">-100（相对调整）</Button>
            <Button size="small" @click="quickAdjustByApi(-500)">-500（相对调整）</Button>
            <Button size="small" @click="quickAdjustByApi(100)">+100（相对调整）</Button>
            <Button size="small" @click="quickAdjustByApi(500)">+500（相对调整）</Button>
            <Button size="small" @click="quickAdjustByApi(1000)">+1000（相对调整）</Button>
          </div>

          <div class="text-xs text-gray-400 mb-2">以上按钮直接调用相对调整接口（adjust），下方的「设置目标值」使用绝对设置接口（set）</div>

          <div class="text-sm text-gray-500 mb-1">设置积分值为</div>
          <InputNumber
            v-model:value="targetPoints"
            style="width: 200px"
            placeholder="直接输入目标积分值（支持负分）"
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
      </div>
    </Modal>

    <!-- 积分流水 Drawer -->
    <Drawer
      v-model:open="logDrawerVisible"
      :title="`积分流水 - ${logUser?.username ?? ''}`"
      width="620px"
      placement="right"
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
    </Drawer>

    <!-- 积分规则配置弹窗 -->
    <Modal
      v-model:open="configVisible"
      title="积分规则配置"
      width="700px"
      :confirm-loading="configLoading"
      @ok="saveConfig"
      @cancel="configVisible = false"
    >
      <div class="space-y-5 py-2">
        <!-- 积分规则：发放值 + 每日限制 -->
        <div>
          <div class="font-semibold mb-3 text-base">积分规则</div>
          <div class="grid grid-cols-4 gap-x-4 gap-y-2">
            <div><div class="text-xs text-gray-500 mb-1">发布帖子</div><InputNumber v-model:value="configForm.postCreate" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">发布评论</div><InputNumber v-model:value="configForm.commentCreate" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">帖子被点赞</div><InputNumber v-model:value="configForm.postLiked" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">帖子被收藏</div><InputNumber v-model:value="configForm.postFavorited" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">评论被点赞</div><InputNumber v-model:value="configForm.commentLiked" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">每日发帖上限</div><InputNumber v-model:value="configForm.dailyPostLimit" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">每日评论上限</div><InputNumber v-model:value="configForm.dailyCommentLimit" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">每日总分上限</div><InputNumber v-model:value="configForm.dailyTotalLimit" :min="0" size="small" style="width:100%" /></div>
          </div>
          <div class="text-xs text-gray-400 mt-2">上限设为 0 表示不限制，每日总积分仅统计系统发放部分</div>
        </div>

        <!-- 审核与惩罚 -->
        <div>
          <div class="font-semibold mb-3 text-base text-orange-600">审核与惩罚</div>
          <div class="grid grid-cols-3 gap-x-4 gap-y-2 mb-3">
            <div><div class="text-xs text-gray-500 mb-1">帖子违规扣分</div><InputNumber v-model:value="configForm.postRejectPenalty" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">评论违规扣分</div><InputNumber v-model:value="configForm.commentRejectPenalty" :min="0" size="small" style="width:100%" /></div>
            <div><div class="text-xs text-gray-500 mb-1">活动违规扣分</div><InputNumber v-model:value="configForm.activityRejectPenalty" :min="0" size="small" style="width:100%" /></div>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <Switch v-model:checked="configForm.manualRejectDeductEnabled" size="small" />
            <span class="text-xs">人工驳回时扣除积分</span>
            <Switch v-model:checked="configForm.manualRejectAutoBanEnabled" size="small" class="ml-4" />
            <span class="text-xs">人工驳回时自动封禁</span>
          </div>
          <div class="flex items-center gap-2">
            <Switch v-model:checked="configForm.globalFrozen" size="small" />
            <span class="text-xs text-red-500">全局冻结积分收益</span>
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
      width="700px"
      :footer="null"
      @cancel="tierVisible = false"
    >
      <div class="space-y-3">
        <div class="text-xs text-gray-400">
          头衔按积分从高到低匹配，积分达到对应分数线自动更换。右键色块可快速选择颜色。修改后已拥有头衔的用户在下次积分变动时自动更新。
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
              placeholder="分数线"
              style="width: 90px"
            />
          </div>
          <Select v-model:value="tier.color" style="width: 110px" size="small">
            <Select.Option v-for="c in ['magenta','red','volcano','orange','gold','lime','green','cyan','blue','geekblue','purple']" :key="c" :value="c">
              <div class="flex items-center gap-1">
                <span :style="{ display:'inline-block', width:'14px', height:'14px', borderRadius:'2px', backgroundColor: c }" />
                {{ c }}
              </div>
            </Select.Option>
          </Select>
          <div class="flex items-center gap-1" style="flex-shrink: 0;">
            <Switch
              v-model:checked="tier.banOnReach"
              size="small"
              checked-children="封"
              un-checked-children="封"
              :title="tier.banOnReach ? '开启自动封禁' : '关闭自动封禁'"
              :style="tier.banOnReach ? '' : 'opacity: 0.4'"
            />
            <Switch
              v-if="tier.banOnReach"
              v-model:checked="tier.banFreezeIntegral"
              size="small"
              checked-children="冻"
              un-checked-children="冻"
              :title="tier.banFreezeIntegral ? '冻结积分收益' : '不冻结积分收益'"
              :style="tier.banFreezeIntegral ? '' : 'opacity: 0.4'"
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
