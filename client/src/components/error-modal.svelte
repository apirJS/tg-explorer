<script lang="ts">
  import { fly } from 'svelte/transition';
  let { error }: { error: Error | unknown } = $props();
  let show = $state(true);
</script>

{#if show}
  <div class="z-50 fixed inset-0 grid place-items-center" transition:fly>
    <div
      class="w-80 h-60 grid grid-rows-[1fr_3fr_1fr] bg-white text-black rounded-md p-1 items-center"
    >
      <div class="flex justify-end pr-4">
        <button aria-label="close modal" onclick={() => (show = false)}
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"
            />
          </svg></button
        >
      </div>
      <div class="border h-auto max-h-full overflow-y-auto break-all p-1">
        <p>{error instanceof Error ? error.message : 'Unknown error.'}</p>
      </div>
      <div class="flex justify-end pr-4 items-center h-full">
        <button
          class="bg-black text-white w-20 rounded py-1 px-2"
          onclick={() => (show = false)}>OK</button
        >
      </div>
    </div>
  </div>
{/if}
