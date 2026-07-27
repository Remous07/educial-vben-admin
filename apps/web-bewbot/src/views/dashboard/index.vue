<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Col, Row, Statistic } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'Dashboard' });

interface Stats {
  user_count: number;
  message_count: number;
}

const stats = ref<Stats>({ user_count: 0, message_count: 0 });
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
      <Col :span="8">
        <Card>
          <Statistic
            title="用户总数"
            :value="stats.user_count"
            :loading="loading"
          />
        </Card>
      </Col>
      <Col :span="8">
        <Card>
          <Statistic
            title="消息总数"
            :value="stats.message_count"
            :loading="loading"
          />
        </Card>
      </Col>
    </Row>
  </Page>
</template>
