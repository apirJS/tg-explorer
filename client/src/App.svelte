<script lang="ts">
  import { onMount } from 'svelte';

  let message = $state('');
  let ws: WebSocket | null = null;

  onMount(() => {
    ws = new WebSocket('ws://localhost:3000/ws');
    ws.addEventListener('open', () => {
      alert('connected');
    });

    ws.addEventListener('message', (event) => {
      alert(event.data);
    });

    return () => {
      ws?.close();
    };
  });

  function sendMessage(event: SubmitEvent) {
    event.preventDefault();
    if (ws) {
      ws.send(message);
    } else {
      alert('Not connected');
    }
  }
</script>

<main class="grid place-items-center min-h-screen">
  <form onsubmit={sendMessage}>
    <input type="text" placeholder="Enter your name" bind:value={message} />
    <button type="submit">Submit</button>
  </form>
</main>
