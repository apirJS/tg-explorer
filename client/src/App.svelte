<script lang="ts">
  import { onMount } from 'svelte';
  import type { WSMessage } from './lib/types';
  import ErrorModal from './components/error-modal.svelte';
  import LoadingToast from './components/loading-toast.svelte';

  let loading = $state<boolean>(false);
  let username = $state<string | null>(null);
  let error = $state<Error | unknown | null>(null);
  let ws = $state<WebSocket | null>(null);
  let webSocketError = $state<boolean>(false);
  let dots = $state<string>('');
  let intervalId: number | undefined = undefined;
  let channelURL = $state<string | null>(null);

  onMount(() => {
    connectWebSocket();
    login();
  });

  async function login() {
    const data = localStorage.getItem('username');
    if (data) {
      username = data;
      return;
    }

    loading = true;
    animateDots();
    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
      });
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
      localStorage.setItem('username', username!);
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

  async function createChannel() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/channels', {
        method: 'POST',
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      channelURL = data.data.channelURL;
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

  function animateDots() {
    const patterns = ['.', '..', '...', ''];
    if (intervalId) {
      clearInterval(intervalId);
    }

    let speed = 300;
    let index = 0;

    intervalId = setInterval(() => {
      dots = patterns[index];
      index = index === patterns.length - 1 ? 0 : index + 1;
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
      class="flex flex-col w-60 h-40 justify-center items-center border p-4 relative"
    >
      {#if !username}
        <button
          disabled={loading}
          onclick={login}
          class="[] disabled:opacity-70 disabled:hover:border-blue-300/50 w-20 text-lg bg-none rounded border-2 border-blue-300/50 hover:border-blue-300 active:border-blue-500 hover:transition hover:duration-500 px-2 py-1 text-white"
          >Login</button
        >
      {:else}
        <span>Welcome {username}</span>
        <button onclick={createChannel} aria-label="create channel"
          >Create channel</button
        >
      {/if}

      {#if loading}
        <LoadingToast />
      {/if}

      {#if error}
        <ErrorModal {error} />
      {/if}
    </div>
  {/if}
</main>
