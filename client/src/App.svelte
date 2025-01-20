<script lang="ts">
  import { onMount } from 'svelte';
  import type { WSMessage } from './lib/types';
  import ErrorModal from './components/error-modal.svelte';
  let loading = $state<boolean>(false);
  let username = $state<string | null>(null);
  let error = $state<Error | unknown | null>(null);
  let ws = $state<WebSocket | null>(null);
  let webSocketError = $state<boolean>(false);

  async function login() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/login');
      if (!response.ok) {
        error = new Error('Failed to login.');
        const msg: WSMessage = {
          type: 'get_creds',
        };
        ws?.send(JSON.stringify(msg));
        return;
      }

      const data = await response.json();
      username = data.data.username;
    } catch (err) {
      error = err;
      setTimeout(() => {
        error = null;
      }, 3000);
    } finally {
      loading = false;
    }
  }

  function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000/ws');

    ws.addEventListener('open', () => {
      console.log('WebSocket connection opened');
    });

    ws.addEventListener('close', () => {
      connectWebSocket();
    });

    ws.addEventListener('error', (err) => {
      webSocketError = true;
      error = err;
    });
  }

  onMount(() => {
    connectWebSocket();
  });
</script>

<main class="grid place-items-center min-h-screen">
  {#if webSocketError}
    <ErrorModal
      error={new Error('WebSocket is not connected!')}
      refreshOnClose={true}
    />
  {:else}
    <div class="flex flex-col w-60 h-60 justify-center items-center p-4">
      {#if !username}
        <button
          onclick={login}
          class="w-20 text-lg bg-none rounded border border-blue-300/50 hover:border-blue-300 active:border-blue-500 hover:transition hover:duration-500 px-2 py-1 text-white"
          >Login</button
        >
      {:else}
        <p>Welcome {username}</p>
      {/if}
    </div>
  {/if}
</main>
