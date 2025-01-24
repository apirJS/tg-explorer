<script lang="ts">
  import Spinner from './spinner.svelte';
  import { fade, fly } from 'svelte/transition';
</script>

<div
  in:fly={{ y: -200, duration: 500 }}
  out:fade={{ duration: 1000 }}
  class="animate-show rounded-md fixed top-12 right-12 px-2 bg-none shadow-xl bg-white p-2 pr-2 text-black flex justify-center items-center gap-x-2"
>
  <Spinner />
  <h2 class="">Loading</h2>
</div>
