<script lang="ts">
  import { onMount } from 'svelte';
  import type { WSMessage } from './lib/types';
  import ErrorModal from './components/error-modal.svelte';
  import LoadingToast from './components/loading-toast.svelte';

  let username = $state<string | null>(null);
  let error = $state<Error | unknown | null>(null);
  let ws = $state<WebSocket | null>(null);
  let webSocketError = $state<boolean>(false);
  let loading = $state<boolean>(false);
  let cooldown = $state(1);

  onMount(() => {
    loading = true;
    connectWebSocket();
    if (ws && ws.readyState !== ws.CONNECTING) {
      login();
    }
    loading = false;
  });

  async function login() {
    loading = true;

    try {
      // const data = localStorage.getItem('fullName');
      // if (data) {
      //   username = data;
      //   return;
      // }

      if (ws) {
        const message: WSMessage<{ timeout: number }> = {
          type: 'login',
          data: {
            timeout: 1000 * 60 * 5,
          },
        };
        ws.send(JSON.stringify(message));
      }
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
      setTimeout(() => {
        connectWebSocket();
        cooldown *= 2;
      }, cooldown * 1000);
    });

    ws.addEventListener('error', (err) => {
      webSocketError = true;
      error = err;
    });

    ws.addEventListener('message', (msg) => {
      const message: WSMessage<any> = msg.data;

      switch (message.type) {
        case 'login_success':
          username =
            (message as WSMessage<{ fullName: string }>).data?.fullName ?? null;
          alert(
            (message as WSMessage<{ fullName: string }>).data?.fullName ?? null
          );
          return;
        case 'already_signed':
          alert('already_signed');
          return;
      }
    });
  }
</script>

{#if loading}
  <LoadingToast />
{/if}

{#if error}
  <ErrorModal {error} />
{/if}

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
          class="disabled:opacity-70 disabled:hover:border-blue-300/50 w-20 text-lg bg-none rounded border-2 border-blue-300/50 hover:border-blue-300 active:border-blue-500 hover:transition hover:duration-500 px-2 py-1 text-white"
          >Login</button
        >
      {:else}
        <span>Welcome {username}</span>
      {/if}
    </div>
  {/if}
</main>
