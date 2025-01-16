<script lang="ts">
  let loading = $state(false);
  let username = $state('');
  let error = $state('');

  async function login() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/login');
      const data = await response.json();
      username = data.data.username;
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error.';
    } finally {
      loading = false;
    }
  }
</script>

<main class="grid place-items-center min-h-screen">
  <div class="flex flex-col items-center space-y-4">
    <button
      class="px-2 py-1 bg-none border border-blue-500 text-white text-lg"
      onclick={login}>Login</button
    >
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p>{error}</p>
    {:else if username}
      <p>Welcome, {username}!</p>
    {/if}
  </div>
</main>
