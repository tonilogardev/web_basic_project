<script lang="ts">
  import type { StacFeature } from "../lib/stacApi";

  interface Props {
    features?: StacFeature[];
    escenasVisibles?: Set<string>;
    onToggle?: (feature: StacFeature) => void;
  }

  let { features = [], escenasVisibles = new Set(), onToggle }: Props = $props();

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
        <label class="check-label">
          <input
            type="checkbox"
            checked={escenasVisibles.has(feature.id)}
            onchange={() => onToggle?.(feature)}
          />
          Ver
        </label>
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

  .check-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #e5e7eb;
    user-select: none;
  }

  .check-label input[type="checkbox"] {
    accent-color: #0ea5e9;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .empty {
    color: #9ca3af;
    text-align: center;
    font-size: 0.9rem;
  }
</style>
