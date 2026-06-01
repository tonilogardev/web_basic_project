<script lang="ts">
  import { onMount } from 'svelte';
  import Dashboard from './Dashboard.svelte';

  // Sistema de rutas extremadamente simple (Menos es Mas)
  let currentRoute = '#login';
  
  // Variables de Login
  let usernameInput = '';
  let passwordInput = '';
  let error = '';
  let loading = false;

  // Estado global del usuario
  let loggedUser = { username: '', roles: [] as string[] };

  function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      loggedUser = JSON.parse(userStr);
      // Si tiene token y está en login, redirigir a dashboard
      if (currentRoute === '#login') {
        window.location.hash = '#dashboard';
      }
    } else {
      // Si no tiene token y no está en login, expulsar al login
      if (currentRoute !== '#login') {
        window.location.hash = '#login';
      }
    }
  }

  onMount(() => {
    // Al cargar la página, leer la URL actual (o asignar #login por defecto)
    currentRoute = window.location.hash || '#login';
    checkAuth();

    // Escuchar cuando el usuario cambia la URL manualmente
    window.addEventListener('hashchange', () => {
      currentRoute = window.location.hash;
      checkAuth();
    });
  });

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Limpiar formulario y redirigir
      usernameInput = '';
      passwordInput = '';
      window.location.hash = '#dashboard';
      
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

{#if currentRoute === '#login'}
  <main class="login-wrapper">
    <div class="login-container">
      <h1>DataSphere</h1>
      
      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <form on:submit|preventDefault={handleLogin}>
        <div class="input-group">
          <label for="username">Usuario</label>
          <input 
            id="username" 
            type="text" 
            bind:value={usernameInput} 
            required 
            autocomplete="username"
            placeholder="ej: user_read"
          />
        </div>

        <div class="input-group">
          <label for="password">Contraseña</label>
          <input 
            id="password" 
            type="password" 
            bind:value={passwordInput} 
            required 
            autocomplete="current-password"
            placeholder="••••••"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>
      </form>
    </div>
  </main>
{:else if currentRoute === '#dashboard'}
  <Dashboard username={loggedUser.username} userRoles={loggedUser.roles} />
{/if}

<style>
  .login-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
  }
</style>
