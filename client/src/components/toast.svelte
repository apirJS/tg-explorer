<script lang="ts">
  import CloseIcon from '../icons/close-icon.svelte';
  import Spinner from './spinner.svelte';
  const { message }: { message: string; async?: boolean; duration?: number } =
    $props();
</script>

<div class="fixed inset-0 bg-none">
  <div
    class="relative w-60 h-24 bg-white p-2 text-black grid grid-cols-[9fr_1fr]"
  >
    <button class="absolute top-2 right-2"><CloseIcon /></button>
    <div><h2>{message}</h2></div>
    <div><Spinner /></div>
  </div>
</div>
