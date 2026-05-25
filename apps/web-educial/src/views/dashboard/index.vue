<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Col, Row, Spin, Statistic } from 'ant-design-vue';

import { getHomeStatisticsApi } from '#/api/modules/statistics';

defineOptions({ name: 'Dashboard' });

const loading = ref(true);
const stats = ref<Record<string, any>>({});

async function loadStats() {
  loading.value = true;
  try {
    const res = await getHomeStatisticsApi();
    stats.value = res?.result ?? res ?? {};
  } catch {
    // backend may not have /admin/statistics/home endpoint yet
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);
</script>

<template>
  <Page description="Educial 教育理念交流平台管理后台" title="仪表盘">
    <Spin :spinning="loading">
      <Row :gutter="16">
        <Col :span="6">
          <Card>
            <Statistic title="用户总数" :value="stats.userCount ?? '-'" />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic title="帖子总数" :value="stats.postCount ?? '-'" />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic title="评论总数" :value="stats.commentCount ?? '-'" />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic title="活动总数" :value="stats.activityCount ?? '-'" />
          </Card>
        </Col>
      </Row>
    </Spin>
  </Page>
</template>
