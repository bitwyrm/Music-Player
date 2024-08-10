import {
	addSavedPlaylist,
	cleanup,
	downloadSong,
	forceFixLibrary,
	// getAltSources,
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
	let songsDict;
	const playlistsName = [];
	const playlistsSongs = [];
	if (playlistId) {
		const data = await getYTPlaylist(playlistId);
		songsDict = data.songsDict;
		playlistsName.push(data.playlistName);
		playlistsSongs.push(data.songs);
	} else {
		let first = true;
		for (const currPlaylistId of playlistIds) {
			const data = await getYTPlaylist(currPlaylistId);
			if (first) {
				first = false;
				songsDict = data.songsDict;
			} else {
				for (const id in data.songsDict) {
					songsDict[id] = data.songsDict[id];
				}
			}
			playlistsName.push(data.playlistName);
			playlistsSongs.push(data.songs);
		}
	}

	const library = getLibrary();
	// Force mappings
	console.log("Applying force mappings");
	const forceMap = getForceMap();
	for (let i = 0; i < playlistsSongs.length; i++) {
		for (let j = 0; j < playlistsSongs[i].length; j++) {
			if (playlistsSongs[i][j] in forceMap) {
				const mappedId = forceMap[playlistsSongs[i][j]];
				playlistsSongs[i][j] = mappedId;
				if (!(mappedId in songsDict) && !(mappedId in library)) {
					songsDict[mappedId] = await getYTSong(mappedId);
				}
			}
		}
	}

	const songs = [...new Set(playlistsSongs.flat(1))];
	for (let i = songs.length - 1; i >= 0; i--) {
		if (songs[i] in library) songs.splice(songs.indexOf(songs[i]), 1);
	}
	await forceFixLibrary(songs, library, songsDict, forceMap);

	console.log(`${songs.length} songs to download`);
	let [addToLibrary, failedSongs] = await downloadSongList(songs);

	for (let i = 0; i < playlistsSongs.length; i++) {
		playlistsSongs[i] = playlistsSongs[i].filter((song) =>
			!failedSongs.includes(song),
		);
	}

	for (const song of addToLibrary) {
		library[song] = songsDict[song];
	}
	saveLibrary(library);
	console.log("Library updated.");

	if (playlistId) {
		const i = playlists.youtube.findIndex((el) => el.playlistId === playlistId);
		playlists.youtube[i] = {
			playlistId: playlistId,
			playlistName: playlistsName[0],
			songs: playlistsSongs[0],
		};
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
			el.id = `https://www.youtube.com/watch?v=${el.id}`;
			return el;
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
