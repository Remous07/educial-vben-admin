<script lang="ts" setup>
import {
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

const props = withDefaults(
  defineProps<{
    siteKey: string;
    size?: 'compact' | 'normal';
  }>(),
  { size: 'normal' },
);

const emit = defineEmits<{
  error: [];
  expired: [];
  verified: [token: string];
}>();

const containerRef = ref<HTMLElement>();
const widgetId = ref<string>('');

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    document.head.append(script);
  });
}

async function renderWidget() {
  await loadScript();
  await nextTick();
  if (!containerRef.value) return;

  // Clean up any previous widget on this container
  if (widgetId.value) {
    window.turnstile?.remove(widgetId.value);
    widgetId.value = '';
  }

  const id = window.turnstile?.render(containerRef.value, {
    action: 'login',
    cData: '',
    callback: (token: string) => emit('verified', token),
    'error-callback': () => emit('error'),
    'expired-callback': () => {
      emit('expired');
      if (widgetId.value) window.turnstile?.reset(widgetId.value);
    },
    sitekey: props.siteKey,
    size: props.size,
    theme: 'auto',
  });

  if (id) widgetId.value = id;
}

function reset() {
  if (widgetId.value) {
    window.turnstile?.reset(widgetId.value);
  }
}

async function mountWidget() {
  await nextTick();
  // Small delay ensures Cloudflare API is ready for re-render
  await new Promise((r) => setTimeout(r, 100));
  renderWidget();
}

function unmountWidget() {
  if (widgetId.value) {
    window.turnstile?.remove(widgetId.value);
    widgetId.value = '';
  }
}

onMounted(mountWidget);
onUnmounted(unmountWidget);
// KeepAlive: re-render on activation, clean up on deactivation
onActivated(mountWidget);
onDeactivated(unmountWidget);

defineExpose({ reset });
</script>

<template>
  <div ref="containerRef" class="turnstile-container"></div>
</template>

<style scoped>
.turnstile-container {
  min-height: 65px;
}
</style>
