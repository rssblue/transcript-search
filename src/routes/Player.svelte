<script>
	import { onMount } from 'svelte';
	export let player;
	export let transcriptIndex;
	export let episodeTranscript;

	onMount(() => {
		player.ontimeupdate = () => {
			let playerTime = player?.currentTime || 0;

			while (playerTime >= episodeTranscript?.[transcriptIndex + 1]?.start) {
				transcriptIndex++;
			}

			while (playerTime < episodeTranscript?.[transcriptIndex]?.start) {
				transcriptIndex--;
			}
		};
	});
</script>

<audio 
  class="fixed bottom-0 left-0 right-0 z-50 mb-2 px-2 sm:px-5"
  bind:this={player}
  controls 
  />

<style>
	audio {
		width: 100%;
		height: 54px;
	}
</style>
