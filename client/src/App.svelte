<script lang="ts">
  import { onMount } from 'svelte';
  let loading = $state(false);
  let username = $state('');
  let error = $state<null | string>(null);

  async function login() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/login');
      const data = await response.json();
      username = data.data.username;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error.';
      setTimeout(() => {
        error = null;
      }, 3000);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const ws = new WebSocket('http://localhost:3000/ws');
    ws.addEventListener('error', (err) => {
      error =
        err instanceof Error ? err.message : 'WebSocket failed to connect.';
    });
  });
</script>

<main class="grid place-items-center min-h-screen">
  <div class="flex flex-col items-center space-y-4">
    <button
      class="px-2 py-1 bg-none border border-blue-500 text-white text-lg"
      onclick={login}>Login</button
    >
    {#if loading}
      <p>Loading...</p>
    {:else if username}
      <p>Welcome {username}</p>
    {/if}
    {#if error}
      <p>error: {error}</p>
    {/if}
  </div>
</main>
