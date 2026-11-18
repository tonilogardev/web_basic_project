<script lang="ts">
  import { store } from '../lib/store.svelte';
</script>

<header class="topbar">
  <!-- Brand Identity -->
  <div class="brand">
    <div class="brand-badge">
      <span>AQ</span>
    </div>
    <div class="brand-text">
      <h1>tonilogar Aqua</h1>
      <span class="brand-tag">Water Contamination Analytics</span>
    </div>
  </div>

  <!-- Actions & User Profile -->
  <div class="actions">
    {#if store.activeUser}
      <div class="user-pill">
        <div class="user-avatar">
          {store.activeUser.name.charAt(0).toUpperCase()}
        </div>
        <div class="user-details">
          <span class="user-name">{store.activeUser.name}</span>
          <span class="user-tier">{store.activeUser.tier.toUpperCase()}</span>
        </div>
      </div>
    {/if}

    <button
      id="btn-create-user"
      class="btn-primary"
      onclick={() => store.openUserModal()}
      title="Create a new user in tonilogar Aqua"
      aria-label="Create a new user in tonilogar Aqua"
    >
      <span>Create User</span>
    </button>
  </div>
</header>

<style>
  .topbar {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: 60px;
    background: var(--color-bg-card);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-floating);
    z-index: 1000;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brand-badge {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 10px rgba(6, 182, 212, 0.4);
  }

  .brand-text h1 {
    margin: 0;
    font-size: 1.12rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 60%, var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .brand-tag {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .user-pill {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 0.25rem 0.65rem 0.25rem 0.35rem;
    border-radius: var(--radius-full);
  }

  .user-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    color: #ffffff;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .user-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #ffffff;
  }

  .user-tier {
    font-size: 0.62rem;
    color: var(--color-accent);
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    color: #ffffff;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.55rem 1.05rem;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(2, 132, 199, 0.45);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.55);
    transform: translateY(-1px);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  /* Responsive Rules */
  @media (max-width: 860px) {
    .topbar {
      padding: 0 0.85rem;
    }
    .brand-tag {
      display: none;
    }
  }

  @media (max-width: 768px), (pointer: coarse) {
    .btn-primary span {
      display: none;
    }
    .btn-primary {
      padding: 0.6rem;
      border-radius: var(--radius-md);
    }
  }
</style>
