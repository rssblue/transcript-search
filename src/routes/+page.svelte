<script>
	import { parse } from 'fast-xml-parser';
	import { decode } from 'html-entities';

	import Player from './Player.svelte';
	import Transcripts from './Transcripts.svelte';

	const parserOptions = {
		attributeNamePrefix: '@_',
		//attrNodeName: false,
		//textNodeName : "#text",
		ignoreAttributes: false,
		ignoreNameSpace: false,
		attrValueProcessor: (val, attrName) => decode(val), //default is a=>a
		tagValueProcessor: (val, tagName) => decode(val) //default is a=>a
	};

	let feed = {};
	let selectedEpisode = {};
	let searchResults = [];
	let podcastIndexSearchResults = [];
	let searchQuery;
	let searchInput = '';
	let player;
	let transcriptIndex = 0;
	let episodeTranscript;
	let isLoading = false;
	let isLoaded = false;

	let indexQuery = '';
	// indexQuery = 'podcasting 2.0';

	function handleInput(e, cb) {
		if (e.key === 'Enter') {
			cb();
		}
	}

	async function searchPodcastIndex() {
		searchResults = [];
		feed = {};
		selectedEpisode = {};
		searchQuery = '';
		searchInput = '';
		let url = `api/queryindex?q=${encodeURIComponent(`/search/byterm?q=${indexQuery}`)}`;

		const res = await fetch(url);
		let data = await res.json();

		try {
			data = JSON.parse(data);
			data.feeds = data.feeds || [data.feed];
			podcastIndexSearchResults = data.feeds;
		} catch (error) {}
	}

	async function fetchTranscript(feedUrl) {
		podcastIndexSearchResults = [];
		isLoading = true;
		isLoaded = false;
		searchResults = [];
		feed = {};
		selectedEpisode = {};
		searchQuery = '';
		searchInput = '';
		// searchInput = '"rad"';
		let res = await fetch('/api/proxy?q=' + encodeURIComponent(feedUrl));
		let data = await res.text();
		let xml2Json = parse(data, parserOptions);

		let xmlJson = xml2Json;

		feed = xmlJson.rss.channel;
		let _item = [].concat(feed.item);
		for (const [i, v] of _item.entries()) {
			let transcript = []
				.concat(v['podcast:transcript'])
				.find((v) => v?.['@_type'].includes('srt') || v?.['@_type'].includes('x-subrip'));

			if (transcript) {
				let res = await fetch('/api/proxy?q=' + encodeURIComponent(transcript['@_url']));
				let data = await res.text();
				_item[i].fetchedTranscript = data;
				_item[i]['podcast:transcript'] = transcript;
			}
		}

		feed.item = _item;
		isLoading = false;
		isLoaded = true;
	}

	function searchTranscripts(recall) {
		if (!recall) {
			selectedEpisode = {};
		}
		searchResults = [];
		searchQuery = searchInput || '';

		const numItems = feed.item.length;

		function search(string, searchQuery) {
			let regex;
			if (searchQuery.startsWith('"') && searchQuery.endsWith('"')) {
				const word = searchQuery.slice(1, -1);
				regex = new RegExp(`\\b${word}\\b[\\p{P}-]*`, 'gi');
			} else {
				regex = new RegExp(searchQuery, 'gi');
			}
			return string?.match(regex) || [];
		}

		for (let i = 0; i < numItems; i++) {
			const v = feed.item[i];
			const results = search(v.fetchedTranscript, searchQuery);
			if (results.length) {
				searchResults.push([i, results]);
			}
		}
		if (isLoading) {
			setTimeout(searchTranscripts.bind(this, true), 500);
		}
	}
</script>

<header class="flex flex-col max-w-5xl mx-auto prose mt-3">
  <h1 class="text-center">Transcript Search Tool</h1>
  <div class="flex flex-col md:flex-row flex md:justify-around text-center gap-3">
    <span>
    Install
			<a
				href="https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe"
			>
				<img class="inline-block w-6 h-6 my-0"
        src="/alby-small.png" alt="alby logo" />
				Alby
			</a>
		</span>
    <span>⚡ <span class="select-all">transcriptsearchtool@getalby.com</span></span>
  </div>
			
</header>
<main class="prose mx-auto max-w-3xl mt-7 flex flex-col px-2 md:px-0">

		<div class="flex w-full md:w-3/5 mx-auto flex-col md:flex-row">
			<input
        class="block w-full h-10 border border-gray-300 rounded-tl-md rounded-tr-md md:rounded-tr-none md:rounded-bl-md text-center placeholder:text-center md:placeholder:text-left md:text-left"
				bind:value={indexQuery}
				placeholder="Podcast title"
				on:keypress={(e) => handleInput(e, searchPodcastIndex)}
			/>
			<button 
        class="h-10 px-4 border border-gray-300 border-t-0 rounded-bl-md rounded-br-md md:border-t md:border-l-0 md:rounded-bl-none md:rounded-tr-md bg-gray-100 hover:bg-gray-200 font-bold"
        on:click={searchPodcastIndex}
        >Search</button>
		</div>

	{#if podcastIndexSearchResults.length}
		<ul class="pl-0">
			{#each podcastIndexSearchResults as feed}
				<li 
          class="flex gap-2 items-center hover:bg-gray-100 cursor-pointer pl-0"
          on:click={fetchTranscript.bind(this, feed?.originalUrl)}
          >
					<img 
            class="my-0 w-16"
            src={feed?.artwork || feed?.image} 
            alt={feed?.title}
            width="40"
            height="40" />
					{feed?.title}
				</li>
			{/each}
		</ul>
	{/if}

	{#if feed?.title}
		<h2>{feed?.title || ''}</h2>
		<search-transcripts>
			<input
				bind:value={searchInput}
				placeholder={`search term  (put exact matches inside of double quotes, i.e. "rad"`}
				on:keypress={(e) => handleInput(e, searchTranscripts)}
			/>
			<button on:click={searchTranscripts}>Search Transcripts</button>
		</search-transcripts>

		{#if searchResults?.length}
			<pane-container>
				<left-pane>
					<h3>Episodes</h3>
					<ul>
						{#each searchResults || [] as result}
							<li
								on:click={() => {
									selectedEpisode = feed.item[result[0]];
									player.src = selectedEpisode.enclosure['@_url'];
								}}
							>
								{feed.item[result[0]].title} - {result[1].length} occurrence{`${
									result[1].length > 1 ? 's' : ''
								}`}
							</li>
						{/each}
					</ul>
				</left-pane>
				<right-pane>
					<Transcripts
						episode={selectedEpisode}
						{searchQuery}
						{player}
						bind:transcriptIndex
						bind:episodeTranscript
					/>
				</right-pane>
			</pane-container>
			<Player bind:player bind:transcriptIndex bind:episodeTranscript />
		{:else if !isLoading}
			<p>No Search Results Found</p>{/if}
	{/if}
</main>

<style>
	pane-container {
		display: flex;
		justify-content: space-between;
		width: 100%;
		height: calc(100vh - 250px);
		overflow: hidden;
		margin: 16px 0;
		border: 2px solid lightgray;
	}

	left-pane,
	right-pane {
		width: 50%;
		overflow: auto;
		height: 100%;
	}

	right-pane {
		border-left: 1px solid lightgray;
	}
	left-pane {
		border-right: 1px solid lightgray;
	}
	left-pane ul {
		overflow: auto;
		height: calc(100% - 308px);
		border-bottom: 2px solid lightgray;
		margin: 8px 0 0 0;
	}

	.pi-result {
		display: flex;
		align-items: center;
	}

	.pi-result img {
		padding-right: 8px;
	}
</style>
