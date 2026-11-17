<script lang="ts">
  import { store, type UserTier } from '../lib/store.svelte';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let tier = $state<UserTier>('freemium');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = '';

    if (!name.trim()) {
      errorMessage = 'Por favor, ingresa el nombre de usuario.';
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      errorMessage = 'Por favor, ingresa un correo electrónico válido.';
      return;
    }
    if (password.length < 6) {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    isSubmitting = true;
    setTimeout(() => {
      store.createUser({
        name: name.trim(),
        email: email.trim(),
        tier,
      });
      isSubmitting = false;
      name = '';
      email = '';
      password = '';
    }, 600);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      store.closeUserModal();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      store.closeUserModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if store.isUserModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div>
          <h2 id="modal-title">Crear Nuevo Usuario</h2>
          <p class="subtitle">Acceso a la plataforma tonilogar Aqua</p>
        </div>
        <button class="btn-close" aria-label="Cerrar modal" onclick={() => store.closeUserModal()}>
          &times;
        </button>
      </div>

      {#if errorMessage}
        <div class="error-banner" role="alert">
          {errorMessage}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="modal-form">
        <div class="form-group">
          <label for="user-name">Nombre Completo</label>
          <input
            id="user-name"
            type="text"
            bind:value={name}
            placeholder="Ej. Dra. Marta Costa"
            required
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label for="user-email">Correo Electrónico</label>
          <input
            id="user-email"
            type="email"
            bind:value={email}
            placeholder="ejemplo@agencia.cat"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="user-password">Contraseña</label>
          <input
            id="user-password"
            type="password"
            bind:value={password}
            placeholder="Mínimo 6 caracteres"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <span id="tier-label" class="group-label">Nivel de Suscripción</span>
          <div class="tier-options" role="radiogroup" aria-labelledby="tier-label">
            <label class="tier-card" class:selected={tier === 'freemium'}>
              <input type="radio" name="tier" value="freemium" bind:group={tier} />
              <div class="tier-info">
                <div class="tier-title">
                  <span class="badge free">Gratis</span> Freemium
                </div>
                <p>Acceso global con Sentinel-2 y polígonos libres de hasta 25 km².</p>
              </div>
            </label>

            <label class="tier-card" class:selected={tier === 'pro'}>
              <input type="radio" name="tier" value="pro" bind:group={tier} />
              <div class="tier-info">
                <div class="tier-title">
                  <span class="badge pro">290 €/mes</span> Pro
                </div>
                <p>Monitorización automatizada en zonas críticas (Delta del Ebro, Tarragona, Llobregat/Besòs).</p>
              </div>
            </label>

            <label class="tier-card" class:selected={tier === 'enterprise'}>
              <input type="radio" name="tier" value="enterprise" bind:group={tier} />
              <div class="tier-info">
                <div class="tier-title">
                  <span class="badge enterprise">1.250 €/mes</span> Enterprise
                </div>
                <p>Analítica histórica retrospectiva desde 2015, cuotas ampliadas y descarga de rásteres.</p>
              </div>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick={() => store.closeUserModal()} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" class="btn-submit" disabled={isSubmitting}>
            {#if isSubmitting}
              <span class="spinner"></span> Creando usuario...
            {:else}
              Registrar Usuario
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8, 14, 26, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1.25rem;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-card {
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    padding: 2rem;
    box-shadow:
      0 20px 45px -10px rgba(0, 0, 0, 0.7),
      0 0 35px -5px rgba(56, 189, 248, 0.15);
    color: #f1f5f9;
    font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transform: translateY(0);
    animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: 90vh;
    overflow-y: auto;
  }

  @keyframes popIn {
    from {
      transform: translateY(16px) scale(0.97);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 1rem;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(6, 182, 212, 0.1));
    border: 1px solid rgba(56, 189, 248, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #38bdf8;
    flex-shrink: 0;
  }

  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .subtitle {
    margin: 0.15rem 0 0 0;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .btn-close {
    margin-left: auto;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 1.75rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .btn-close:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    padding: 0.65rem 0.9rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  label,
  .group-label {
    font-size: 0.82rem;
    font-weight: 500;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  input[type='text'],
  input[type='email'],
  input[type='password'] {
    width: 100%;
    box-sizing: border-box;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #ffffff;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    outline: none;
    font-family: inherit;
  }

  input[type='text']:focus,
  input[type='email']:focus,
  input[type='password']:focus {
    border-color: #38bdf8;
    background: rgba(30, 41, 59, 0.8);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .tier-options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .tier-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(30, 41, 59, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tier-card:hover {
    background: rgba(51, 65, 85, 0.5);
    border-color: rgba(56, 189, 248, 0.4);
  }

  .tier-card.selected {
    background: rgba(14, 165, 233, 0.12);
    border-color: #38bdf8;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
  }

  .tier-card input[type='radio'] {
    margin-top: 0.25rem;
    accent-color: #38bdf8;
    cursor: pointer;
  }

  .tier-info {
    flex: 1;
  }

  .tier-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.92rem;
    color: #f8fafc;
  }

  .tier-info p {
    margin: 0.25rem 0 0 0;
    font-size: 0.78rem;
    color: #94a3b8;
    line-height: 1.35;
    text-transform: none;
    letter-spacing: normal;
  }

  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge.free {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
  }

  .badge.pro {
    background: rgba(56, 189, 248, 0.25);
    color: #38bdf8;
  }

  .badge.enterprise {
    background: rgba(168, 85, 247, 0.25);
    color: #c084fc;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid rgba(148, 163, 184, 0.25);
    color: #cbd5e1;
    padding: 0.7rem 1.25rem;
    border-radius: 10px;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .btn-cancel:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
  }

  .btn-submit {
    background: linear-gradient(135deg, #0284c7, #06b6d4);
    border: none;
    color: #ffffff;
    padding: 0.7rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: inherit;
  }

  .btn-submit:hover:not(:disabled) {
    background: linear-gradient(135deg, #0369a1, #0891b2);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
    transform: translateY(-1px);
  }

  .btn-submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-submit:disabled,
  .btn-cancel:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
