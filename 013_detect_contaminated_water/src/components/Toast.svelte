<script lang="ts">
  import { store } from '../lib/store.svelte';
</script>

{#if store.notification}
  <aside class="toast toast-{store.notification.type}" role="status" aria-live="polite">
    <div class="toast-dot"></div>
    <span>{store.notification.text}</span>
  </aside>
{/if}

<style>
  .toast {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.95);
    border-radius: var(--radius-md);
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.88rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
    z-index: 2000;
    animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translate(-50%, 12px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .toast-success {
    border: 1px solid rgba(52, 211, 153, 0.4);
    color: #a7f3d0;
  }

  .toast-success .toast-dot {
    background-color: var(--color-success);
    box-shadow: 0 0 8px var(--color-success);
  }

  .toast-info {
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #bae6fd;
  }

  .toast-info .toast-dot {
    background-color: var(--color-accent);
    box-shadow: 0 0 8px var(--color-accent);
  }

  .toast-warn {
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fde68a;
  }

  .toast-warn .toast-dot {
    background-color: var(--color-warn);
    box-shadow: 0 0 8px var(--color-warn);
  }

  .toast-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
</style>
