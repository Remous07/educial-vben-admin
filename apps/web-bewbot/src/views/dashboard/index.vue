<script lang="ts" setup>
import type { RouteRecordStringComponent } from '@vben/types';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Card, Col, Row } from 'ant-design-vue';

import { getAllMenusApi } from '#/api/core/menu';
import { requestClient } from '#/api/request';

defineOptions({ name: 'Dashboard' });

interface Stats {
  user_count: number;
  admin_count: number;
  active_session_count: number;
  message_count: number;
}

const router = useRouter();
const userStore = useUserStore();

const username = computed(() => userStore.userInfo?.username || '管理员');

const today = new Date().toLocaleDateString('zh-CN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const stats = ref<Stats>({
  user_count: 0,
  admin_count: 0,
  active_session_count: 0,
  message_count: 0,
});
const loading = ref(false);

async function fetchStats() {
  loading.value = true;
  try {
    stats.value = await requestClient.get('/stats');
  } finally {
    loading.value = false;
  }
}

// ── quick links (filtered by permission) ──

interface QuickLink {
  path: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    path: '/messages',
    icon: 'lucide:message-square',
    title: '我的访客',
    desc: '查看与管理访客会话',
    color: '#1677ff',
  },
  {
    path: '/users',
    icon: 'lucide:users',
    title: 'TG 用户',
    desc: '浏览 Telegram 用户',
    color: '#52c41a',
  },
  {
    path: '/conversation-codes',
    icon: 'lucide:key-round',
    title: '对话识别码',
    desc: '管理主码与临时识别码',
    color: '#fa8c16',
  },
  {
    path: '/system/admin-users',
    icon: 'lucide:shield',
    title: '系统用户',
    desc: '管理后台账户与权限组',
    color: '#722ed1',
  },
  {
    path: '/system/invite-codes',
    icon: 'lucide:gift',
    title: '注册设置',
    desc: '邀请码与注册规则',
    color: '#eb2f96',
  },
  {
    path: '/system/roles',
    icon: 'lucide:user-cog',
    title: '系统角色',
    desc: '配置角色与权限',
    color: '#13c2c2',
  },
];

// Visible paths come from the backend menu endpoint — the same source the
// sidebar uses — so quick links always match what the user can actually reach.
const visiblePaths = ref<Set<string>>(new Set());
const visibleLinks = computed(() =>
  QUICK_LINKS.filter((link) => visiblePaths.value.has(link.path)),
);

function collectPaths(
  items: RouteRecordStringComponent[],
  out: Set<string>,
): void {
  for (const item of items) {
    if (item.path) out.add(item.path);
    if (item.children?.length) collectPaths(item.children, out);
  }
}

async function fetchVisiblePaths() {
  try {
    const menus = await getAllMenusApi();
    const paths = new Set<string>();
    collectPaths(menus ?? [], paths);
    visiblePaths.value = paths;
  } catch {
    visiblePaths.value = new Set();
  }
}

const statCards = computed(() => [
  {
    title: 'TG 用户',
    value: stats.value.user_count,
    icon: 'lucide:users',
    color: '#1677ff',
    bg: '#e6f4ff',
  },
  {
    title: '系统用户',
    value: stats.value.admin_count,
    icon: 'lucide:shield',
    color: '#52c41a',
    bg: '#f6ffed',
  },
  {
    title: '活跃会话',
    value: stats.value.active_session_count,
    icon: 'lucide:message-circle',
    color: '#fa8c16',
    bg: '#fff7e6',
  },
  {
    title: '会话总数',
    value: stats.value.message_count,
    icon: 'lucide:file-text',
    color: '#722ed1',
    bg: '#f9f0ff',
  },
]);

onMounted(() => {
  fetchStats();
  fetchVisiblePaths();
});
</script>

<template>
  <Page>
    <!-- Welcome banner -->
    <div
      style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        background: linear-gradient(120deg, #e6f4ff 0%, #f9f0ff 100%);
        border: 1px solid #f0f0f0;
        border-radius: 12px;
      "
    >
      <div>
        <div style="font-size: 20px; font-weight: 600; color: #1d1d1d">
          👋 你好，{{ username }}
        </div>
        <div style="margin-top: 6px; font-size: 13px; color: #666">
          {{ today }} · 欢迎回来，以下是系统概览
        </div>
      </div>
      <IconifyIcon
        icon="lucide:layout-dashboard"
        style="font-size: 40px; color: #1677ff33"
      />
    </div>

    <!-- Stat cards -->
    <Row :gutter="[16, 16]" style="margin-top: 16px">
      <Col v-for="card in statCards" :key="card.title" :xs="12" :sm="6">
        <Card class="stat-card" :loading="loading">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
            "
          >
            <div>
              <div style="font-size: 13px; color: #888">{{ card.title }}</div>
              <div
                style="
                  margin-top: 4px;
                  font-size: 26px;
                  font-weight: 700;
                  color: #1d1d1d;
                "
              >
                {{ card.value }}
              </div>
            </div>
            <div
              class="stat-icon"
              :style="{ background: card.bg, color: card.color }"
            >
              <IconifyIcon :icon="card.icon" style="font-size: 22px" />
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <!-- Quick links -->
    <div v-if="visibleLinks.length" style="margin-top: 24px">
      <div style="margin-bottom: 12px; font-size: 15px; font-weight: 600">
        快捷入口
      </div>
      <Row :gutter="[16, 16]">
        <Col
          v-for="link in visibleLinks"
          :key="link.path"
          :xs="12"
          :sm="12"
          :md="8"
        >
          <Card
            class="quick-card"
            :hoverable="true"
            @click="router.push(link.path)"
          >
            <div style="display: flex; gap: 12px; align-items: center">
              <div
                class="quick-icon"
                :style="{ background: `${link.color}1a`, color: link.color }"
              >
                <IconifyIcon :icon="link.icon" style="font-size: 20px" />
              </div>
              <div>
                <div style="font-weight: 600">{{ link.title }}</div>
                <div style="margin-top: 2px; font-size: 12px; color: #888">
                  {{ link.desc }}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  </Page>
</template>

<style scoped>
.stat-card {
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

.stat-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.quick-card {
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.quick-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

.quick-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}
</style>
