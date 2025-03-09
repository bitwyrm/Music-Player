import {
	addSavedPlaylist,
	cleanup,
	downloadSong,
	forceFixLibrary,
	getForceMap,
	getLibrary,
	getSavedPlaylists,
	getYTPlaylist,
	getYTSong,
	reportFailed,
	saveLibrary,
	savePlaylists,
} from "./library-manager.js";

export async function syncYoutubePlaylists(playlistId) {
	const playlists = getSavedPlaylists();
	const playlistIds = playlists.youtube.map((el) => el.playlistId);

	console.log("Fetching YouTube playlists");
	let songsDict = {};
	const playlistsName = [];
	const playlistsSongs = [];
	if (playlistId) {
		const data = await getYTPlaylist(playlistId);
		songsDict = data.songsDict;
		playlistsName.push(data.playlistName);
		playlistsSongs.push(data.songs);
	} else {
		for (const currPlaylistId of playlistIds) {
			const data = await getYTPlaylist(currPlaylistId);
			for (const id in data.songsDict) {
				songsDict[id] = data.songsDict[id];
			}
			playlistsName.push(data.playlistName);
			playlistsSongs.push(data.songs);
		}
	}

	const library = getLibrary();
	// Force mappings
	console.log("Applying force mappings");
	const forceMap = getForceMap();
	for (const selectedPlaylist of playlistsSongs) {
		for (let j = 0; j < selectedPlaylist.length; j++) {
			if (selectedPlaylist[j] in forceMap) {
				const mappedId = forceMap[selectedPlaylist[j]];
				selectedPlaylist[j] = mappedId;
				if (!(mappedId in songsDict) && !(mappedId in library)) {
					songsDict[mappedId] = await getYTSong(mappedId);
				}
			}
		}
	}

	const songs = [
		...new Set(playlistsSongs.flat(1)).difference(
			new Set(Object.keys(library)),
		),
	];
	await forceFixLibrary(songs, library, songsDict, forceMap);

	console.log(`${songs.length} songs to download`);
	let [addToLibrary, failedSongs] = await downloadSongList(songs);

	for (let i = 0; i < playlistsSongs.length; i++) {
		playlistsSongs[i] = playlistsSongs[i].filter(
			(song) => !failedSongs.includes(song),
		);
	}

	for (const song of addToLibrary) {
		library[song] = songsDict[song];
	}
	saveLibrary(library);
	console.log("Library updated.");

	if (playlistId) {
		const playlist = playlists.youtube.find(
			(el) => el.playlistId === playlistId,
		);
		playlist.playlistName = playlistsName[0];
		playlist.songs = playlistsSongs[0];
	} else {
		playlists.youtube = playlistsSongs.map((playlist, i) => {
			return {
				playlistId: playlistIds[i],
				playlistName: playlistsName[i],
				songs: playlist,
			};
		});
	}

	savePlaylists(playlists);
	console.log("Playlists updated.");
	cleanup();

	if (failedSongs.length > 0) {
		failedSongs = failedSongs.map((el) => {
			return `https://www.youtube.com/watch?v=${el}`;
		});
		reportFailed(failedSongs);
	}
}

async function downloadSongList(songs) {
	const successes = [];
	for (const song of songs) {
		successes.push(await downloadSong(song));
		console.log(
			`${successes.length}/${songs.length} complete (${((successes.length * 100) / songs.length).toFixed(2)}%)`,
		);
	}

	console.log(
		`${successes.length - successes.filter(Boolean).length} songs failed\n`,
	);

	const failedSongs = [];
	const addToLibrary = songs.filter((el, i) => {
		if (!successes[i]) failedSongs.push(el);
		return successes[i];
	});
	return [addToLibrary, failedSongs];
}

export async function addYoutubePlaylist(playlistId) {
	addSavedPlaylist(playlistId);
	await syncYoutubePlaylists(playlistId);
}
