<script lang="ts">
  import { fly } from 'svelte/transition';
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
          onclick={handleCloseModal}
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"
            />
          </svg></button
        >
      </div>
      <div
        class="border border-neutral-500/30 rounded-sm h-full overflow-y-auto break-all p-1"
      >
        <p class="select-text">{error instanceof Error ? error.message : 'Unknown error.'}</p>
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
