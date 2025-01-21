<script lang="ts">
  import { onMount } from 'svelte';
  import type { WSMessage } from './lib/types';
  import ErrorModal from './components/error-modal.svelte';
  let loading = $state<boolean>(false);
  let username = $state<string | null>(null);
  let error = $state<Error | unknown | null>(null);
  let ws = $state<WebSocket | null>(null);
  let webSocketError = $state<boolean>(false);
  let dots = $state<string>('');
  let intervalId: number | undefined = undefined;

  onMount(() => {
    connectWebSocket();
    login();
  });

  async function login() {
    loading = true;
    animateDots();
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
      clearInterval(intervalId);
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

  function animateDots() {
    if (intervalId) {
      clearInterval(intervalId);
    }

    let speed = 300;
    let len = 1;

    intervalId = setInterval(() => {
      dots = '.'.repeat(len);
      len = len === 3 ? 0 : len + 1;
    }, speed);
  }
</script>

<main class="grid place-items-center min-h-screen">
  {#if webSocketError}
    <ErrorModal
      error={new Error('WebSocket is not connected!')}
      refreshOnClose={true}
    />
  {:else}
    <div
      class="flex flex-col w-60 h-40 justify-center items-center p-4 relative"
    >
      {#if !username}
        <button
          disabled={loading}
          onclick={login}
          class="[] disabled:opacity-70 disabled:hover:border-blue-300/50 w-20 text-lg bg-none rounded border-2 border-blue-300/50 hover:border-blue-300 active:border-blue-500 hover:transition hover:duration-500 px-2 py-1 text-white"
          >Login</button
        >
      {:else if error}
        <ErrorModal {error} />
      {:else}
        <span>Welcome {username}</span>
      {/if}

      {#if loading}
        <span class="absolute bottom-5">loading{dots}</span>
      {/if}
    </div>
  {/if}
</main>
