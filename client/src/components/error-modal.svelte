<script lang="ts">
  import { fly } from 'svelte/transition';
  import CloseIcon from '../icons/close-icon.svelte';
  
  let {
    error,
    refreshOnClose = false,
  }: { error: Error | unknown; refreshOnClose?: boolean } = $props();
  let show = $state(true);

  function handleCloseModal() {
    show = false;
    if (refreshOnClose) {
      window.location.reload();
    }
  }
</script>

{#if show}
  <div
    class="z-50 fixed inset-0 grid place-items-center select-none"
    transition:fly
  >
    <div
      class="w-80 h-60 grid grid-rows-[1fr_3fr_1fr] bg-white text-black rounded-md p-1 items-center"
    >
      <div class="flex justify-center pr-4 relative">
        <h1 class="font-mono font-semibold text-lg">Error</h1>
        <button
          class="absolute right-0"
          aria-label="close modal"
          onclick={handleCloseModal}><CloseIcon /></button
        >
      </div>
      <div
        class="border border-neutral-500/30 rounded-sm h-full overflow-y-auto break-all p-1"
      >
        <p class="select-text">
          {error instanceof Error ? error.message : 'Unknown error.'}
        </p>
      </div>
      <div class="flex justify-end pr-4 items-center h-full">
        <button
          class="bg-black text-white w-20 rounded py-[2px] px-2"
          onclick={handleCloseModal}>OK</button
        >
      </div>
    </div>
  </div>
{/if}
