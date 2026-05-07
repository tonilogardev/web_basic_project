<script lang="ts">
  import type { StacFeature } from "../lib/stacApi";

  interface Props {
    features?: StacFeature[];
    onSeleccion?: (feature: StacFeature) => void;
  }

  let { features = [], onSeleccion }: Props = $props();

  function formatDate(datetime: string): string {
    return datetime.slice(0, 10);
  }
</script>

{#if features.length === 0}
  <p class="empty">No hay escenas disponibles.</p>
{:else}
  <ul class="lista">
    {#each features as feature (feature.id)}
      <li class="item">
        <div class="info">
          <span class="id">{feature.id}</span>
          <span class="meta">
            {formatDate(feature.properties.datetime)} · {feature.properties["eo:cloud_cover"]}% nubes
          </span>
        </div>
        <button class="btn-ver" onclick={() => onSeleccion?.(feature)}>
          Ver
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .id {
    font-family: monospace;
    font-size: 0.8rem;
    color: #4ade80;
  }

  .meta {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .btn-ver {
    padding: 6px 14px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn-ver:hover {
    background: #0284c7;
  }

  .empty {
    color: #9ca3af;
    text-align: center;
    font-size: 0.9rem;
  }
</style>
