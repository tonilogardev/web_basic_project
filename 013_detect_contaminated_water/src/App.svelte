<script lang="ts">
  import MapView from './components/MapView.svelte';
  import Topbar from './components/Topbar.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import PassList from './components/PassList.svelte';
  import WaterLegend from './components/WaterLegend.svelte';
  import Toast from './components/Toast.svelte';
  import UserModal from './components/UserModal.svelte';
  import { store } from './lib/store.svelte';
  import { searchController } from './lib/controllers/SearchController';

  function handleSearch() {
    searchController.executeSearch();
  }
</script>

<main class="app-root">
  <!-- Interactive Topographic Map Engine -->
  <MapView />

  <!-- Floating Header & Controls -->
  <Topbar />

  <!-- Draggable Aqua Sentinel Query Window -->
  <ControlPanel onSearch={handleSearch} />

  <!-- Multi-window Satellite Pass Feeds -->
  {#each store.sessions as session (session.id)}
    <PassList {session} />
  {/each}

  <!-- Real-time Spectral Quality Classification Legend -->
  <WaterLegend />

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
