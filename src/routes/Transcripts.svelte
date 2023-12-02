<script>
	import parseSRT from 'parse-srt';
	import VirtualList from 'svelte-tiny-virtual-list';

	export let episode;
	export let searchQuery = '';
	export let player;
	export let transcriptIndex = 0;
	export let episodeTranscript;

	let scrollToIndex = 0;
	let currentIndex = 0;

	let listHeight = 0;
	let scrollToAlignment = 'start';

	let scrollStatus = 'Disabled';

	let filteredIndices = [];

	$: console.log(episode);

	$: if (episode && episode.fetchedTranscript) {
		console.log(episode['podcast:transcript']);
		const type = episode?.['podcast:transcript']?.['@_type'];
		const transcriptSRT =
			type === 'application/srt' || type === 'text/srt' || type === 'application/x-subrip';

		if (transcriptSRT) {
			let transcript = parseSRT(episode.fetchedTranscript);
			let t = transcript
				.map((v) => v.text)
				.join(' ')
				.replace(/(<|&lt;)br\s*\/*(>|&gt;)/g, ' ');

			episodeTranscript = [...transcript];
			transcript.full = t.split('|-|').join(' ');
			searchTranscript(searchQuery);
		} else {
			episodeTranscript = null;
		}
	} else {
		episodeTranscript = null;
	}

	function jumpToSection(section, index) {
		if (section.start) {
			player.currentTime = section.start;
			transcriptIndex = index;
		}
	}

	$: if (transcriptIndex && scrollStatus === 'Enabled') {
		scrollToIndex = transcriptIndex;
	}

	function searchTranscript(transcriptSearchQuery) {
		if (transcriptSearchQuery) {
			scrollStatus = 'Disabled';
			currentIndex = 0;
			filteredIndices = getAllIndexes(episodeTranscript, transcriptSearchQuery);
			if (filteredIndices.length > 0) {
				setTimeout(() => {
					scrollToIndex = filteredIndices[0];
					jumpToSection(episodeTranscript?.[scrollToIndex], scrollToIndex);
				}, 10);

				scrollToAlignment = 'center';
			}
		} else {
			currentIndex = 0;
			scrollToIndex = transcriptIndex || 0;
			filteredIndices = [];
			scrollToAlignment = 'start';
		}

		function search(string, searchQuery) {
			let regex;
			if (searchQuery.startsWith('"') && searchQuery.endsWith('"')) {
				const word = searchQuery.slice(1, -1);
				regex = new RegExp(`\\b${word}\\b[\\p{P}-]*`, 'gi');
			} else {
				regex = new RegExp(searchQuery, 'gi');
			}

			return string.match(regex);
		}

		function getAllIndexes(arr, val) {
			var indexes = [],
				i;
			for (i = 0; i < arr.length; i++) {
				if (search(arr[i].text, val)) {
					indexes.push(i);
				}
			}
			return indexes;
		}
	}

	function handleScrollStatus() {
		scrollStatus = scrollStatus === 'Enabled' ? 'Disabled' : 'Enabled';
	}

	function getNextIndex() {
		currentIndex++;
		if (currentIndex === filteredIndices.length) {
			currentIndex = 0;
		}
		scrollToIndex = undefined;
		setTimeout(() => {
			(scrollToIndex = filteredIndices[currentIndex]), 1;
			jumpToSection(episodeTranscript?.[scrollToIndex], scrollToIndex);
		});
	}
	function getPreviousIndex() {
		currentIndex--;
		if (currentIndex === -1) {
			currentIndex = filteredIndices.length - 1;
		}
		scrollToIndex = undefined;
		setTimeout(() => {
			(scrollToIndex = filteredIndices[currentIndex]), 1;
			jumpToSection(episodeTranscript?.[scrollToIndex], scrollToIndex);
		});
	}

	function convertTime(time) {
		try {
			let formatTime = new Date(time * 1000).toISOString().substr(11, 8);
			if (formatTime.charAt(0) === '0') {
				return formatTime.substring(1);
			}

			return formatTime;
		} catch {
			(err) => console.log(err);
		}
	}
</script>

{#if episodeTranscript?.length}
	<h3 class="text-center">{episode.title}</h3>
	<div class="flex mb-3">
		<label class="flex items-center">
			<input type="checkbox" checked={scrollStatus === 'Enabled'} on:change={handleScrollStatus} />
      <span class="ml-2">
			Scrolling {scrollStatus}
      </span>
		</label>
		{#if filteredIndices.length > 0}
			<div class="ml-auto">
				<button class="previous" on:click={getPreviousIndex}>&#9664</button>
				<span>
					{currentIndex + 1} of {filteredIndices.length}
				</span>
				<button class="next" on:click={getNextIndex}>&#9654</button>
			</div>
		{/if}
	</div>

	<div class="h-80 md:h-screen overflow-y-auto" bind:clientHeight={listHeight}>
		<VirtualList
			height={listHeight}
			itemCount={episodeTranscript.length}
			itemSize={50}
			overscanCount={5}
			{scrollToIndex}
			{scrollToAlignment}
		>
			<div
				slot="item"
				let:index
				let:style
				{style}
				class="flex items-center my-7"
				class:text-red-600={index === transcriptIndex}
				class:font-bold={index === transcriptIndex || index === filteredIndices[currentIndex]}
				class:text-purple-600={index === filteredIndices[currentIndex]}
				on:click={jumpToSection.bind(this, episodeTranscript?.[index], index)}
			>
				<span class="leading-snug">
					{@html episodeTranscript?.[index].text || ''}
				</span>
				<span class="flex-none ml-auto text-sm font-mono mr-1">
					{convertTime(episodeTranscript?.[index].start) ?? ''}
				</span>
			</div>
		</VirtualList>
	</div>
{/if}
