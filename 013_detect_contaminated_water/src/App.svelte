<script lang="ts">
  import MapView from './components/MapView.svelte';
  import Topbar from './components/Topbar.svelte';
  import Toast from './components/Toast.svelte';
  import UserModal from './components/UserModal.svelte';
</script>

<main class="app-root">
  <!-- Interactive Topographic Map Engine -->
  <MapView />

  <!-- Floating Header & Controls -->
  <Topbar />

  <!-- Feedback & Status Toasts -->
  <Toast />

  <!-- User Creation Dialog -->
  <UserModal />
</main>

<style>
  .app-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
