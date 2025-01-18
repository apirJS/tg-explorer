<script lang="ts">
  import { onMount } from 'svelte';
  import type { WSMessage } from './lib/types';
  let loading = $state<boolean>(false);
  let username = $state<string | null>(null);
  let error = $state<null | string>(null);
  let ws = $state<WebSocket | null>(null);

  async function login() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/login');
      if (!response.ok) {
        error = 'Failed to login.';
        const msg: WSMessage = {
          type: 'get_creds',
        };
        ws?.send(JSON.stringify(msg));
        return;
      }

      const data = await response.json();
      username = data.data.username;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Server error.';
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
      setTimeout(connectWebSocket, 5000);
    });

    ws.addEventListener('error', (err) => {
      error =
        err instanceof Error ? err.message : 'WebSocket failed to connect.';
    });
  }

  onMount(() => {
    connectWebSocket();
  });

  function isWebSocketReady() {
    return ws && ws.readyState !== WebSocket.CLOSED;
  }
</script>

<main class="grid place-items-center min-h-screen">
  {#if !isWebSocketReady()}
    <p>WebSocket is not connected</p>
  {:else}
    <div class="flex flex-col w-60 h-60 justify-center items-center p-4">
      <button
        onclick={login}
        class="w-20 text-lg bg-none rounded border border-blue-300/50 hover:border-blue-300 active:border-blue-500 hover:transition hover:duration-500 px-2 py-1 text-white"
        >Login</button
      >
    </div>
  {/if}
</main>
