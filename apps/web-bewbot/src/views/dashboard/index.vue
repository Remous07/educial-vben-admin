<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Col, Row, Statistic } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'Dashboard' });

interface Stats {
  user_count: number;
  admin_count: number;
  active_session_count: number;
  message_count: number;
}

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

onMounted(fetchStats);
</script>

<template>
  <Page>
    <Row :gutter="[16, 16]">
      <Col :span="6">
        <Card>
          <Statistic
            title="TG 用户"
            :loading="loading"
            :value="stats.user_count"
          >
            <template #prefix>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="#1677ff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="系统用户"
            :loading="loading"
            :value="stats.admin_count"
          >
            <template #prefix>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="#52c41a"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="活跃会话"
            :loading="loading"
            :value="stats.active_session_count"
          >
            <template #prefix>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="#fa8c16"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                />
              </svg>
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="会话总数"
            :loading="loading"
            :value="stats.message_count"
          >
            <template #prefix>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="#722ed1"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            </template>
          </Statistic>
        </Card>
      </Col>
    </Row>
  </Page>
</template>
