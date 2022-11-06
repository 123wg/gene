<script setup lang="ts">
import { Profile } from '@/feature/common/Profile'
import { View } from '@/feature/common/View'
import { onMounted } from 'vue'

onMounted(() => {
    const view = new View()
    ;(window as any).view = view
    // 初始化剖切
    const profile = new Profile(view)
    window.profile = profile
})
</script>

<template>
    <div id="gene-canvas" class="gene-canvas"></div>
</template>

<style lang="scss" scoped>
.gene-canvas {
    width: 100%;
    height: 100%;
}
</style>
