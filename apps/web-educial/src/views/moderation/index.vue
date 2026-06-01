<script lang="ts" setup>
import { h, ref } from 'vue';

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
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  TabPane,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getAiConfigApi,
  getModerationConfigApi,
  getModerationLogApi,
  getTencentConfigApi,
  manualReviewApi,
  saveAiConfigApi,
  saveTencentConfigApi,
  setModerationConfigApi,
} from '#/api/modules/moderation';
import { getAppUserApi } from '#/api/modules/app-user';

defineOptions({ name: 'ModerationManage' });

// --- 审核模式 ---
const reviewMode = ref('off');
const modeSaving = ref(false);
const modeLoading = ref(false);

const modeOptions = [
  { label: '关闭（直接发布）', value: 'off' },
  { label: '人工审核（新内容需审核）', value: 'manual' },
  { label: 'AI审核', value: 'ai' },
  { label: '腾讯云审核（AI 自动检测）', value: 'tencent' },
];

// --- 附件内容管理 ---
const attachmentMode = ref('off');
const attachmentSaving = ref(false);

// --- AI/腾讯云审核不通过自动封禁 ---
const autoBanEnabled = ref(false);

const attachmentModeOptions = [
  { label: '关闭（直接发布）', value: 'off' },
  { label: '人工审核（含附件需审核）', value: 'manual' },
  { label: '腾讯云审核（AI 自动检测）', value: 'tencent' },
];

async function loadConfig() {
  modeLoading.value = true;
  try {
    const res = await getModerationConfigApi();
    reviewMode.value = res?.config?.mode ?? 'off';
    attachmentMode.value = res?.config?.attachmentMode ?? 'off';
    autoBanEnabled.value = res?.config?.autoBan ?? false;
  } catch {
    /* */
  } finally {
    modeLoading.value = false;
  }
}

async function handleSaveMode() {
  modeSaving.value = true;
  const submitted = {
    mode: reviewMode.value,
    autoBan: autoBanEnabled.value,
  };
  try {
    await setModerationConfigApi(reviewMode.value, undefined, autoBanEnabled.value);
    message.success('审核模式已更新');
    // 重新拉取配置，验证保存是否真正生效
    await loadConfig();
    // 对比服务器返回值与提交值
    if (reviewMode.value !== submitted.mode || autoBanEnabled.value !== submitted.autoBan) {
      message.warning('保存成功，但服务器返回值与提交的不一致，建议刷新页面确认');
    }
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    modeSaving.value = false;
  }
}

async function handleSaveAttachmentMode() {
  attachmentSaving.value = true;
  const submitted = { attachmentMode: attachmentMode.value };
  try {
    await setModerationConfigApi(undefined, attachmentMode.value);
    message.success('附件审核模式已更新');
    // 重新拉取配置，验证保存是否真正生效
    await loadConfig();
    if (attachmentMode.value !== submitted.attachmentMode) {
      message.warning('保存成功，但服务器返回值与提交的不一致，建议刷新页面确认');
    }
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    attachmentSaving.value = false;
  }
}

// --- AI 审核配置 ---
const aiConfig = ref({ apiKey: '', apiUrl: 'https://api.deepseek.com', model: 'deepseek-chat' });
const aiConfigSaving = ref(false);

async function loadAiConfig() {
  try {
    const res = await getAiConfigApi();
    if (res?.aiConfig) aiConfig.value = res.aiConfig;
  } catch { /* */ }
}

async function handleSaveAiConfig() {
  aiConfigSaving.value = true;
  const submitted = { ...aiConfig.value };
  try {
    await saveAiConfigApi(aiConfig.value);
    message.success('AI 审核配置已保存');
    // 重新拉取配置，验证保存是否真正生效
    await loadAiConfig();
    const loaded = aiConfig.value;
    const mismatch = Object.keys(submitted).some(key => submitted[key] !== loaded[key]);
    if (mismatch) {
      message.warning('保存成功，但服务器返回值与提交的不一致，建议刷新页面确认');
    }
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    aiConfigSaving.value = false;
  }
}

// --- 腾讯云配置 ---
const tencentConfig = ref({ secretId: '', secretKey: '', region: 'ap-guangzhou', bizType: '' });
const tencentConfigSaving = ref(false);

async function loadTencentConfig() {
  try {
    const res = await getTencentConfigApi();
    if (res?.tencentConfig) tencentConfig.value = res.tencentConfig;
  } catch { /* */ }
}

async function handleSaveTencentConfig() {
  tencentConfigSaving.value = true;
  const submitted = { ...tencentConfig.value };
  try {
    await saveTencentConfigApi(tencentConfig.value);
    message.success('腾讯云配置已保存');
    // 重新拉取配置，验证保存是否真正生效
    await loadTencentConfig();
    const loaded = tencentConfig.value;
    const mismatch = Object.keys(submitted).some(key => submitted[key] !== loaded[key]);
    if (mismatch) {
      message.warning('保存成功，但服务器返回值与提交的不一致，建议刷新页面确认');
    }
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    tencentConfigSaving.value = false;
  }
}

loadAiConfig();
loadTencentConfig();

// --- 审核日志 ---
const logLoading = ref(false);
const logData = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(10);
const logSearchForm = ref({
  keyword: '' as string,
  targetType: undefined as string | undefined,
  mode: undefined as string | undefined,
  result: undefined as number | undefined,
  timeRange: '' as '' | 'today' | 'week' | 'month',
  dateRange: [] as any[],
});

// 排序状态
const sortField = ref('');
const sortOrder = ref('');

// 详情弹窗
const detailVisible = ref(false);
const currentLog = ref<any>(null);

// 用户详情模态框（复用用户管理风格）
const violatorModalVisible = ref(false);
const violatorFormData = ref<Record<string, any>>({});

// 审核配置弹窗
const configModalVisible = ref(false);

const logColumns = [
  { title: 'ID', dataIndex: 'id', width: 60, sorter: true },
  {
    title: '类型',
    dataIndex: 'targetType',
    width: 70,
    customRender: ({ text }: any) => ({ post: '帖子', activity: '活动', comment: '评论', profile: '用户资料' }[text] ?? text),
  },
  { title: '目标ID', dataIndex: 'targetId', width: 70 },
  { title: '内容', dataIndex: 'content', width: 160, ellipsis: true },
  { title: '概括', dataIndex: 'summary', width: 140, ellipsis: true },
  {
    title: '方式',
    dataIndex: 'mode',
    width: 60,
    customRender: ({ text }: any) => ({ ai: 'AI', manual: '人工', off: '关闭', tencent: '腾讯云' }[text] ?? text),
  },
  {
    title: '结果',
    dataIndex: 'result',
    width: 70,
    sorter: true,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'green' }, () => '通过')
        : h(Tag, { color: 'red' }, () => '驳回'),
  },
  { title: '原因', dataIndex: 'reason', width: 150, ellipsis: true },
  {
    title: '审核人',
    dataIndex: 'reviewer',
    width: 80,
    customRender: ({ text, record }: any) => {
      if (record?.mode === 'ai') return 'AI审核官';
      if (record?.mode === 'tencent') return '腾讯云审核';
      return text || '-';
    },
  },
  {
    title: '用户信息',
    dataIndex: 'violator',
    width: 140,
    customRender: ({ record }: any) => {
      const v = record.violator ?? {};

      const uid = v.uid ?? record.violatorUid ?? null;
      const username = v.username ?? record.violatorUsername ?? null;
      const avatar = v.avatar ?? record.violatorAvatar ?? null;

      const displayName = username || (uid != null ? `用户#${uid}` : null);

      if (!uid && !displayName && !avatar) return '-';

      return h(Space, { size: 'small' }, () => [
        h(Avatar, { size: 24, src: avatar }),
        h(
          'span',
          {
            style: { color: uid ? '#1890ff' : '#999', cursor: uid ? 'pointer' : 'default' },
            onClick: uid ? () => handleViewViolator(Number(uid)) : undefined,
          },
          displayName || '未知用户',
        ),
      ]);
    }
  },
  { title: '时间', dataIndex: 'createTime', width: 160, sorter: true },
  {
    title: '操作',
    width: 210,
    fixed: 'right' as const,
    customRender: ({ record }: any) => {
      const isProfile = record.targetType === 'profile';
      return h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleViewDetail(record) },
          () => '详情',
        ),
        isProfile
          ? h(Button, { size: 'small', disabled: true }, () => '通过')
          : h(
              Popconfirm,
              {
                title: '确认通过该内容吗？',
                onConfirm: () => handleManualReview(record, true),
              },
              {
                default: () =>
                  h(Button, { size: 'small', type: 'primary' }, () => '通过'),
              },
            ),
        isProfile
          ? h(Button, { size: 'small', disabled: true }, () => '驳回')
          : h(
              Popconfirm,
              {
                title: '确认驳回该内容吗？',
                onConfirm: () => handleManualReview(record, false),
              },
              {
                default: () =>
                  h(Button, { size: 'small', danger: true }, () => '驳回'),
              },
            ),
      ]);
    },
  },
];

function getOriginalUrl(record: any): string {
  if (!record) return '';
  const id = record.targetId;
  if (record.targetType === 'post') {
    return `https://www.educial.net/#/pages/post/post?id=${id}`;
  }
  if (record.targetType === 'activity') {
    return `https://www.educial.net/#/pages/activity/detail?id=${id}`;
  }
  // 评论通常依附于帖子，暂时跳到对应帖子（若后端有评论详情页可再调整）
  if (record.targetType === 'comment') {
    return `https://www.educial.net/#/pages/post/post?id=${id}`; // 退化为帖子页，用户可手动找评论
  }
  return '';
}

function openOriginal(record: any) {
  const url = getOriginalUrl(record);
  if (url) window.open(url, '_blank');
}

async function loadLogs(resetPage = false) {
  if (resetPage) {
    logPage.value = 1;
  }
  logLoading.value = true;
  try {
    const params: Record<string, any> = { page: logPage.value, limit: logPageSize.value };
    if (logSearchForm.value.keyword?.trim()) params.keyword = logSearchForm.value.keyword.trim();
    if (logSearchForm.value.targetType) params.targetType = logSearchForm.value.targetType;
    if (logSearchForm.value.mode) params.mode = logSearchForm.value.mode;
    if (logSearchForm.value.result !== undefined) params.result = String(logSearchForm.value.result);

    // 时间范围
    if (logSearchForm.value.timeRange) {
      const now = dayjs();
      if (logSearchForm.value.timeRange === 'today') { params.startTime = now.startOf('day').format('YYYY-MM-DD HH:mm:ss'); params.endTime = now.endOf('day').format('YYYY-MM-DD HH:mm:ss'); }
      else if (logSearchForm.value.timeRange === 'week') { params.startTime = now.startOf('week').format('YYYY-MM-DD HH:mm:ss'); params.endTime = now.endOf('week').format('YYYY-MM-DD HH:mm:ss'); }
      else if (logSearchForm.value.timeRange === 'month') { params.startTime = now.startOf('month').format('YYYY-MM-DD HH:mm:ss'); params.endTime = now.endOf('month').format('YYYY-MM-DD HH:mm:ss'); }
    } else if (logSearchForm.value.dateRange?.length === 2) {
      params.startTime = dayjs(logSearchForm.value.dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      params.endTime = dayjs(logSearchForm.value.dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    }

    // 排序参数
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }

    const res = await getModerationLogApi(params);
    const data = res?.page;
    logData.value = data?.list ?? [];
    logTotal.value = data?.totalCount ?? 0;
  } finally {
    logLoading.value = false;
  }
}

function onSearch() {
  loadLogs(true);
}

function onReset() {
  logSearchForm.value = { keyword: '', targetType: undefined, mode: undefined, result: undefined, timeRange: '', dateRange: [] };
  loadLogs(true);
}
function onTimeRangeChange() {
  logSearchForm.value.dateRange = [];
}
function onDateRangeChange() {
  logSearchForm.value.timeRange = '';
  onSearch();
}

function onRefresh() {
  loadLogs(false);
}

function handleTableChange(_p: any, _f: any, s: any) {
  if (s.order) {
    sortField.value = s.field;
    sortOrder.value = s.order === 'ascend' ? 'asc' : 'desc';
  } else {
    sortField.value = '';
    sortOrder.value = '';
  }
  loadLogs(true);
}

function onPageChange(p: number, ps: number) {
  logPage.value = p;
  logPageSize.value = ps;
  loadLogs();
}

async function handleViewDetail(record: any) {
  currentLog.value = record;
  detailVisible.value = true;
}

async function handleViewViolator(uid: number) {
  if (!uid) return;
  try {
    const res = await getAppUserApi(uid);
    violatorFormData.value = res?.user ?? {};
  } catch {
    /* */
  }
  violatorModalVisible.value = true;
}

async function handleManualReview(record: any, approved: boolean) {
  try {
    await manualReviewApi({
      targetType: record.targetType,
      targetId: record.targetId,
      result: approved ? 1 : 0,
    });
    message.success(approved ? '已通过' : '已驳回');
    // 刷新列表
    loadLogs(false);
    // 如果详情弹窗开着也刷新当前数据
    if (detailVisible.value && currentLog.value?.id === record.id) {
      // 简单处理：关闭弹窗或保持（这里选择刷新后关闭以避免状态不一致）
      detailVisible.value = false;
    }
  } catch (err: any) {
    message.error(err?.message || '操作失败');
  }
}

loadConfig();
loadLogs(true);
</script>

<template>
  <Page description="管理内容审核模式与查看审核记录" title="审核管理">
    <!-- 搜索表单 -->
    <Card class="mb-4">
      <Form layout="inline" :model="logSearchForm">
        <Form.Item label="关键词" style="min-width: 220px">
          <Input
            v-model:value="logSearchForm.keyword"
            allow-clear
            placeholder="搜索内容或用户名"
            style="width: 200px"
            @pressEnter="onSearch"
            @clear="onSearch"
          />
        </Form.Item>
        <Form.Item label="类型">
          <Select
            v-model:value="logSearchForm.targetType"
            allow-clear
            placeholder="全部类型"
            style="width: 110px"
            @change="onSearch"
          >
            <Select.Option value="post">帖子</Select.Option>
            <Select.Option value="activity">活动</Select.Option>
            <Select.Option value="comment">评论</Select.Option>
            <Select.Option value="profile">用户资料</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="方式">
          <Select
            v-model:value="logSearchForm.mode"
            allow-clear
            placeholder="全部方式"
            style="width: 110px"
            @change="onSearch"
          >
            <Select.Option value="ai">AI</Select.Option>
            <Select.Option value="tencent">腾讯云</Select.Option>
            <Select.Option value="manual">人工</Select.Option>
            <Select.Option value="off">关闭</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="结果">
          <Select
            v-model:value="logSearchForm.result"
            allow-clear
            placeholder="全部结果"
            style="width: 110px"
            @change="onSearch"
          >
            <Select.Option :value="1">通过</Select.Option>
            <Select.Option :value="0">驳回</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="时间">
          <Select
            v-model:value="logSearchForm.timeRange"
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
            v-model:value="logSearchForm.dateRange"
            style="width: 240px"
            @change="onDateRangeChange"
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onReset">重置</Button>
            <Button @click="onRefresh">刷新</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>

    <!-- 审核日志表格 -->
    <Card title="审核记录">
      <template #extra>
        <Button size="small" @click="configModalVisible = true">
          审核配置
        </Button>
      </template>

      <Table
        :columns="logColumns"
        :data-source="logData"
        :loading="logLoading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 1350 }"
        @change="handleTableChange"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="logPage"
          v-model:page-size="logPageSize"
          :total="logTotal"
          show-size-changer
          @change="onPageChange"
        />
      </div>
    </Card>

    <!-- 审核记录详情弹窗 -->
    <Modal
      v-model:open="detailVisible"
      title="审核记录详情"
      :footer="null"
      width="620px"
      destroy-on-close
    >
      <div v-if="currentLog" class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-x-6 gap-y-3">
          <div><span class="text-gray-500">日志ID：</span>{{ currentLog.id }}</div>
          <div>
            <span class="text-gray-500">类型：</span>
            {{ { post: '帖子', activity: '活动', comment: '评论', profile: '用户资料' }[currentLog.targetType] ?? currentLog.targetType }}
            #{{ currentLog.targetId }}
          </div>
          <div><span class="text-gray-500">审核方式：</span>{{ { ai: 'AI', manual: '人工', off: '关闭', tencent: '腾讯云' }[currentLog.mode] ?? currentLog.mode }}</div>
          <div>
            <span class="text-gray-500">结果：</span>
            <Tag :color="currentLog.result === 1 ? 'green' : 'red'">
              {{ currentLog.result === 1 ? '通过' : '驳回' }}
            </Tag>
          </div>
          <div>
            <span class="text-gray-500">审核人：</span>
            {{ currentLog.mode === 'ai' ? 'AI审核官' : currentLog.mode === 'tencent' ? '腾讯云审核' : (currentLog.reviewer || '-') }}
          </div>
          <div><span class="text-gray-500">时间：</span>{{ currentLog.createTime }}</div>
        </div>

        <div v-if="currentLog.content">
          <div class="mb-1 text-gray-500">内容快照</div>
          <div class="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed dark:bg-gray-800">
            {{ currentLog.content }}
          </div>
        </div>

        <div v-if="currentLog.summary">
          <div class="mb-1 text-gray-500">AI 概括</div>
          <div class="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
            {{ currentLog.summary }}
          </div>
        </div>

        <div v-if="currentLog.reason">
          <div class="mb-1 text-gray-500">审核原因 / 说明</div>
          <div class="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            {{ currentLog.reason }}
          </div>
        </div>

        <div class="pt-2">
          <Space>
            <Button v-if="getOriginalUrl(currentLog)" type="primary" ghost @click="openOriginal(currentLog)">
              打开原文页面
            </Button>
            <Button @click="detailVisible = false">关闭</Button>
            <template v-if="currentLog.targetType !== 'profile'">
              <Popconfirm
                title="确认通过该内容吗？"
                @confirm="handleManualReview(currentLog, true)"
              >
                <Button type="primary">通过</Button>
              </Popconfirm>
              <Popconfirm
                title="确认驳回该内容吗？"
                @confirm="handleManualReview(currentLog, false)"
              >
                <Button danger>驳回</Button>
              </Popconfirm>
            </template>
            <template v-else>
              <Button type="primary" disabled>通过</Button>
              <Button danger disabled>驳回</Button>
            </template>
          </Space>
        </div>

        <div class="text-xs text-gray-400">
          提示：通过/驳回操作会更新对应内容的实际状态，并记录新的审核日志。
        </div>
      </div>
    </Modal>

    <!-- 用户信息详情模态框（复用用户管理风格） -->
    <Modal v-model:open="violatorModalVisible" title="用户详情" :footer="null" width="480px">
      <div class="mb-4 flex justify-center">
        <Image
          v-if="violatorFormData.avatar"
          :src="violatorFormData.avatar"
          :width="64"
          :preview="true"
          :style="{ borderRadius: '50%', height: '64px', objectFit: 'cover' }"
        />
        <Avatar v-else :size="64" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ violatorFormData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">{{ violatorFormData.username }}</Descriptions.Item>
        <Descriptions.Item label="手机号">{{ violatorFormData.mobile || '-' }}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag :color="violatorFormData.status === 1 ? 'red' : 'green'">
            {{ violatorFormData.status === 1 ? '已封禁' : '正常' }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">{{ violatorFormData.createTime }}</Descriptions.Item>
      </Descriptions>
    </Modal>

    <!-- 审核系统配置弹窗 -->
    <Modal
      v-model:open="configModalVisible"
      title="审核系统配置"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <Tabs default-active-key="1">
        <!-- 基础审核模式 -->
        <TabPane key="1" tab="基础审核模式">
          <div class="py-2">
            <div class="mb-2 text-sm text-gray-500">新内容默认审核方式</div>
            <Radio.Group v-model:value="reviewMode" :options="modeOptions" />

            <div class="mt-6">
              <div class="mb-2 text-sm text-gray-500">AI / 腾讯云审核不通过后自动封禁用户</div>
              <div class="flex items-center gap-3">
                <Switch v-model:checked="autoBanEnabled" />
                <span class="text-sm text-gray-600">{{ autoBanEnabled ? '开启（不通过即自动封禁）' : '关闭（仅记录日志，不自动封禁）' }}</span>
              </div>
            </div>

            <div class="mt-4">
              <Button type="primary" :loading="modeSaving" @click="handleSaveMode">
                保存
              </Button>
            </div>
          </div>
        </TabPane>

        <!-- 附件内容管理 -->
        <TabPane key="2" tab="附件内容管理">
          <div class="py-2">
            <div class="mb-2 text-sm text-gray-500">
              管理包含附件（图片/视频）的帖子和活动的审核方式。活动因必含封面图，始终受此规则影响。
            </div>
            <Radio.Group v-model:value="attachmentMode" :options="attachmentModeOptions" />
            <div class="mt-4">
              <Button
                type="primary"
                :loading="attachmentSaving"
                @click="handleSaveAttachmentMode"
              >
                保存
              </Button>
            </div>
          </div>
        </TabPane>

        <!-- AI 审核配置 -->
        <TabPane key="3" tab="AI 审核配置">
          <div class="py-2 space-y-4">
            <div>
              <div class="mb-1 text-sm text-gray-500">API Key</div>
              <div class="flex gap-2">
                <Input.Password
                  v-model:value="aiConfig.apiKey"
                  placeholder="sk-..."
                  class="flex-1"
                />
              </div>
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">API URL</div>
              <Input v-model:value="aiConfig.apiUrl" placeholder="https://api.deepseek.com" />
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">模型</div>
              <Input v-model:value="aiConfig.model" placeholder="deepseek-chat" />
            </div>
            <Button type="primary" :loading="aiConfigSaving" @click="handleSaveAiConfig">
              保存 AI 配置
            </Button>
          </div>
        </TabPane>

        <!-- 腾讯云配置 -->
        <TabPane key="4" tab="腾讯云内容安全">
          <div class="py-2 space-y-4">
            <div>
              <div class="mb-1 text-sm text-gray-500">SecretId</div>
              <Input v-model:value="tencentConfig.secretId" placeholder="AKID..." />
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">SecretKey</div>
              <div class="flex gap-2">
                <Input.Password
                  v-model:value="tencentConfig.secretKey"
                  placeholder="密钥"
                  class="flex-1"
                />
              </div>
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">区域</div>
              <Input v-model:value="tencentConfig.region" placeholder="ap-guangzhou" />
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">BizType（业务策略）</div>
              <Input v-model:value="tencentConfig.bizType" placeholder="例如：1234567890（可选）" />
              <div class="mt-1 text-xs text-gray-400">用于指定腾讯云内容安全策略，不填则使用默认策略</div>
            </div>
            <Button type="primary" :loading="tencentConfigSaving" @click="handleSaveTencentConfig">
              保存腾讯云配置
            </Button>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  </Page>
</template>
