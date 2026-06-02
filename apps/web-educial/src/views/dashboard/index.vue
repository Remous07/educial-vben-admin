<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Card, Spin, Tooltip } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getHomeStatisticsApi } from '#/api/modules/statistics';

defineOptions({ name: 'Dashboard' });

const router = useRouter();
const userStore = useUserStore();
const loading = ref(true);
const stats = ref<Record<string, any>>({});

// KPI 点击跳转映射
const kpiRoutes: Record<string, string> = {
  user: '/app-user',
  post: '/post',
  comment: '/moderation',
  active: '/app-user',
  mod: '/moderation',
  reject: '/moderation',
  banned: '/app-user',
  integral: '/integral',
};

function goToKpi(id: string) {
  const path = kpiRoutes[id];
  if (path) {
    router.push(path);
  }
}

const userName = computed(() => userStore.userInfo?.realName || '管理员');
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
});
const currentDate = computed(() => dayjs().format('MM月DD日'));

const trends = computed(() => stats.value.trends || {});

function maxVal(list: number[]): number {
  return Math.max(1, ...list);
}

function getDelta(today: any = 0, yesterday: any = 0) {
  const t = Number(today) || 0;
  const y = Number(yesterday) || 0;
  if (!y) return null;
  const pct = Math.round(((t - y) / y) * 100);
  if (Number.isNaN(pct)) return null;
  return { pct, isUp: pct >= 0 };
}

const kpis = computed(() => {
  const s = stats.value || {};
  const dUser = getDelta(s.newUserNum, s.yesterdayNewUserNum);
  const dComment = getDelta(s.todayCommentNum, s.yesterdayCommentCount);
  const integral = s.todayIntegralChange ?? 0;

  return [
    {
      id: 'user',
      label: '总用户',
      value: s.totalUser ?? '-',
      icon: 'lucide:users',
      color: '#2563eb',
      sub: `今日 +${s.newUserNum ?? 0}`,
      delta: dUser,
    },
    {
      id: 'post',
      label: '总帖子',
      value: s.totalPost ?? '-',
      icon: 'lucide:file-text',
      color: '#16a34a',
      sub: `今日 ${s.todayPostNum ?? 0} · 待审 ${s.totalPostOfReview ?? 0}`,
      delta: null,
    },
    {
      id: 'comment',
      label: '总评论',
      value: s.commentCount ?? '-',
      icon: 'lucide:message-circle',
      color: '#ea580c',
      sub: `今日 ${s.todayCommentNum ?? 0}`,
      delta: dComment,
    },
    {
      id: 'active',
      label: '今日活跃',
      value: s.todayActiveUserNum ?? 0,
      icon: 'lucide:activity',
      color: '#7c3aed',
      sub: '活跃用户',
      delta: null,
    },
    {
      id: 'mod',
      label: '今日审核',
      value: s.todayModerationCount ?? 0,
      icon: 'lucide:shield-check',
      color: '#0284c7',
      sub: '内容已处理',
      delta: null,
    },
    {
      id: 'reject',
      label: '今日驳回',
      value: s.todayRejectCount ?? 0,
      icon: 'lucide:x-circle',
      color: '#dc2626',
      sub: '未通过',
      delta: null,
    },
    {
      id: 'banned',
      label: '封禁用户',
      value: s.bannedUserCount ?? 0,
      icon: 'lucide:user-x',
      color: '#b91c1c',
      sub: '当前状态',
      delta: null,
    },
    {
      id: 'integral',
      label: '今日积分',
      value: integral,
      icon: 'lucide:coins',
      color: '#4f46e5',
      sub: integral >= 0 ? '净增长' : '净减少',
      delta: null,
      valueColor: integral >= 0 ? '#16a34a' : '#dc2626',
    },
  ];
});

const weekTotals = computed(() => {
  const t = trends.value;
  const sum = (key: string) =>
    ((t[key] || []) as number[]).reduce((a, b) => a + (b || 0), 0);
  return {
    users: sum('users'),
    posts: sum('posts'),
    comments: sum('comments'),
    integrals: sum('integrals'),
  };
});

// 今日洞察派生指标（纯前端计算，填充空间同时提供价值）
const moderationRate = computed(() => {
  const mod = Number(stats.value.todayModerationCount) || 0;
  const rej = Number(stats.value.todayRejectCount) || 0;
  const total = mod + rej;
  if (!total) return '0';
  return Math.round((mod / total) * 100);
});

const avgPostPerActive = computed(() => {
  const posts = Number(stats.value.todayPostNum) || 0;
  const active = Number(stats.value.todayActiveUserNum) || 0;
  if (!active) return '0.00';
  return (posts / active).toFixed(2);
});

const commentPostRatio = computed(() => {
  const comments = Number(stats.value.todayCommentNum) || 0;
  const posts = Number(stats.value.todayPostNum) || 0;
  if (!posts) return '0.00';
  return (comments / posts).toFixed(2);
});

const bannedRatio = computed(() => {
  const banned = Number(stats.value.bannedUserCount) || 0;
  const total = Number(stats.value.totalUser) || 0;
  if (!total) return '0.00';
  return ((banned / total) * 100).toFixed(2);
});


async function loadStats() {
  loading.value = true;
  try {
    const res = await getHomeStatisticsApi();
    stats.value = res?.result ?? res ?? {};
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);
</script>

<template>
  <Page>
    <Spin :spinning="loading">
      <!-- 欢迎横幅 -->
      <div
        class="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 text-white shadow-xl md:p-6"
      >
        <div class="relative z-10 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex items-center gap-2 text-sm/relaxed opacity-90">
              <span>{{ currentDate }}</span>
              <span class="hidden h-1 w-1 rounded-full bg-white/60 md:inline" />
              <span class="hidden md:inline">管理后台</span>
            </div>
            <div class="mt-0.5 text-3xl font-semibold tracking-tight md:text-4xl">
              {{ greeting }}，{{ userName }}
            </div>
            <div class="mt-0.5 text-sm text-white/80">
              今天也要保持专注，高效处理社区事务 ✨
            </div>
          </div>

          <div class="mt-3 hidden items-center gap-3 md:mt-0 md:flex">
            <div class="rounded-2xl bg-white/15 px-4 py-1.5 text-right text-sm backdrop-blur">
              <div class="text-white/70">今日活跃</div>
              <div class="font-mono text-xl font-semibold tabular-nums">{{ stats.todayActiveUserNum ?? '-' }}</div>
            </div>
          </div>
        </div>

        <!-- 装饰元素 -->
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div class="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      <!-- 核心数据卡片 -->
      <div class="mb-4">
        <div class="mb-2 flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">核心指标</span>
            <button
              class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-500 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800"
              @click="loadStats"
              :disabled="loading"
            >
              <IconifyIcon icon="lucide:refresh-cw" class="size-3" />
              <span>刷新</span>
            </button>
          </div>
          <div class="text-xs text-neutral-400">数据实时更新</div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <div
            v-for="kpi in kpis"
            :key="kpi.id"
            class="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-neutral-200 active:scale-[0.985] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:ring-neutral-700"
            @click="goToKpi(kpi.id)"
          >
            <!-- 左侧色条 -->
            <div
              class="absolute left-0 top-0 h-full w-1 rounded-l-2xl transition-all group-hover:w-[5px]"
              :style="{ backgroundColor: kpi.color }"
            />

            <div class="flex items-start justify-between">
              <!-- 图标 -->
              <div
                class="flex h-9 w-9 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                :style="{ backgroundColor: kpi.color + '15' }"
              >
                <IconifyIcon :icon="kpi.icon" class="size-[18px]" :style="{ color: kpi.color }" />
              </div>

              <!-- 醒目数值 -->
              <div class="text-right">
                <div
                  class="font-mono text-4xl font-bold tabular-nums tracking-[-1.5px] text-neutral-900 leading-none dark:text-white"
                  :style="kpi.valueColor ? { color: kpi.valueColor } : {}"
                >
                  {{ kpi.value }}
                </div>
              </div>
            </div>

            <div class="mt-2.5 flex items-center justify-between text-sm font-medium text-neutral-600 dark:text-neutral-300">
              <span>{{ kpi.label }}</span>
              <IconifyIcon
                icon="lucide:chevron-right"
                class="size-3.5 opacity-0 transition-opacity group-hover:opacity-40"
              />
            </div>

            <div class="mt-0.5 flex items-center justify-between text-xs">
              <span class="text-neutral-500 dark:text-neutral-400">{{ kpi.sub }}</span>

              <!-- 增长率 -->
              <span
                v-if="kpi.delta"
                class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-medium"
                :class="kpi.delta.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
                <IconifyIcon
                  :icon="kpi.delta.isUp ? 'lucide:trending-up' : 'lucide:trending-down'"
                  class="size-3"
                />
                {{ kpi.delta.isUp ? '+' : '' }}{{ kpi.delta.pct }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 7日趋势（加宽柱体 + 柱顶数值） -->
      <Card
        :bordered="false"
        class="overflow-hidden rounded-3xl shadow-sm dark:bg-neutral-900"
      >
        <div class="mb-2.5 flex items-center justify-between px-1">
          <div>
            <span class="text-base font-semibold text-neutral-800 dark:text-neutral-100">7 日趋势</span>
            <span class="ml-2 text-xs text-neutral-400">最近数据变化</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
          <div
            v-for="item in [
              { label: '新增用户', key: 'users', color: '#2563eb', total: weekTotals.users },
              { label: '新增帖子', key: 'posts', color: '#16a34a', total: weekTotals.posts },
              { label: '新增评论', key: 'comments', color: '#ea580c', total: weekTotals.comments },
              { label: '积分净变动', key: 'integrals', color: '#4f46e5', total: weekTotals.integrals },
            ]"
            :key="item.key"
          >
            <div class="mb-1 flex items-baseline justify-between px-0.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ item.label }}</span>
                <span class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  本周 {{ item.total }}
                </span>
              </div>
            </div>

            <!-- 图表区域：仅柱状图 + 顶部数值 -->
            <div class="rounded-2xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60" style="height: 218px">
              <div class="grid h-full grid-cols-7 items-end gap-1.5 px-1 pb-1">
                <template v-for="(val, i) in (trends[item.key] || [])" :key="i">
                  <div class="flex flex-col items-center justify-end h-full">
                    <!-- 柱体顶部数字 -->
                    <div class="mb-0.5 text-center font-mono text-[9px] leading-none text-neutral-500 tabular-nums dark:text-neutral-400">
                      {{ val }}
                    </div>
                    <!-- 柱体（加宽版） -->
                    <Tooltip :title="`${(trends.labels || [])[i] || '-'} : ${val}`">
                      <div
                        class="w-[9px] cursor-pointer rounded-t-md transition-all hover:brightness-110 active:brightness-95"
                        :style="{
                          height: Math.max(6, (val / maxVal(trends[item.key] || [1])) * 170) + 'px',
                          background: `linear-gradient(to top, ${item.color}, ${item.color}cc)`,
                          boxShadow: '0 1px 2px rgb(0 0 0 / 0.1)',
                        }"
                      />
                    </Tooltip>
                  </div>
                </template>
              </div>
            </div>

            <!-- 日期标签 -->
            <div class="mt-1 flex justify-between px-1">
              <span
                v-for="(label, i) in (trends.labels || [])"
                :key="i"
                class="text-center font-mono text-[10px] text-neutral-400"
                style="width: 14%"
              >
                {{ label?.slice(5) || '' }}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <!-- 今日洞察（两行布局，充分利用下方剩余空间） -->
      <div class="mt-4">
        <div class="mb-2 px-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">今日洞察</div>

        <!-- 第一行 -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">今日审核通过率</div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">{{ moderationRate }}</span>
              <span class="text-sm text-neutral-500">%</span>
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">
              {{ stats.todayModerationCount ?? 0 }} 通过 / {{ (stats.todayModerationCount ?? 0) + (stats.todayRejectCount ?? 0) }} 总处理
            </div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">今日人均发帖</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">{{ avgPostPerActive }}</div>
            <div class="mt-0.5 text-xs text-neutral-400">基于今日活跃 {{ stats.todayActiveUserNum ?? 0 }} 人</div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">今日评论 / 发帖比</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">{{ commentPostRatio }}</div>
            <div class="mt-0.5 text-xs text-neutral-400">{{ stats.todayCommentNum ?? 0 }} 评论 / {{ stats.todayPostNum ?? 0 }} 帖子</div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">今日积分净变动</div>
            <div
              class="mt-1 font-mono text-3xl font-semibold tabular-nums"
              :class="(stats.todayIntegralChange ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ (stats.todayIntegralChange ?? 0) >= 0 ? '+' : '' }}{{ stats.todayIntegralChange ?? 0 }}
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">
              {{ (stats.todayIntegralChange ?? 0) >= 0 ? '社区整体积分增长' : '社区整体积分减少' }}
            </div>
          </div>
        </div>

        <!-- 第二行（进一步填充底部空间） -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">封禁用户占比</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {{ bannedRatio }}
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">当前封禁 / 总用户</div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">待审核帖子</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {{ stats.totalPostOfReview ?? 0 }}
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">需要及时处理的队列</div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">本周新增用户</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {{ weekTotals.users }}
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">过去7天累计</div>
          </div>

          <div class="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 dark:text-neutral-400">本周发帖总量</div>
            <div class="mt-1 font-mono text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {{ weekTotals.posts }}
            </div>
            <div class="mt-0.5 text-xs text-neutral-400">过去7天累计</div>
          </div>
        </div>
      </div>

      <!-- 底部提示（极简） -->
      <div class="mt-2 px-1 text-center text-[10px] text-neutral-400">
        数据来源于系统统计 · 建议定期刷新查看最新趋势
      </div>
    </Spin>
  </Page>
</template>
