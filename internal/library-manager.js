import fs from "node:fs";
import YTDlp from "yt-dlp-wrap";
const YTDlpWrap = YTDlp.default;
const ytDlpWrap = new YTDlpWrap("yt-dlp");

export async function getYTSong(id) {
	if (typeof id !== "string")
		throw new Error("Unexpected input: not a string.");

	const songData = JSON.parse(
		await ytDlpWrap.execPromise([
			"-j",
			"--flat-playlist",
			"--no-warnings",
			`https://www.youtube.com/watch?v=${id}`,
		]),
	);

	return {
		song: songData.title,
		artist: songData.channel,
	};
}

export async function getYTPlaylist(playlist) {
	if (typeof playlist !== "string")
		throw new Error("Unexpected input: not a string.");

	let playlistSongs = await ytDlpWrap.execPromise([
		"-j",
		"--flat-playlist",
		"--no-warnings",
		`https://www.youtube.com/playlist?list=${playlist}`,
	]);

	let playlistName = "";
	const songsDict = {};
	playlistSongs = playlistSongs
		.trim()
		.split("\n")
		.map((el) => {
			const songData = JSON.parse(el);
			playlistName = playlistName || songData.playlist_title;

			songsDict[songData.id] = {
				song: songData.title,
				artist: songData.channel,
			};

			return songData.id;
		});

	return {
		playlistName,
		songsDict,
		songs: playlistSongs,
	};
}

export async function downloadSong(id) {

	try {
		await ytDlpWrap.execPromise([
			"-q",
			"--no-warnings",
			"-N",
			"8",
			"--write-thumbnail",

			"-o",
			"internal/temp/%(id)s",

			"-x",
			"--audio-format",
			"mp3",
			"--audio-quality",
			"0",

			`https://www.youtube.com/watch?v=${id}`,
		]);

		if (
			fs.existsSync(`internal/temp/${id}.mp3`) &&
			fs.existsSync(`internal/temp/${id}.webp`)
		) {
			fs.rename(
				`internal/temp/${id}.mp3`,
				`audios/${id}.mp3`,
				(err) => {},
			);

			fs.rename(
				`internal/temp/${id}.webp`,
				`thumbnails/${id}.webp`,
				(err) => {},
			);
		} else {
			throw new Error("Failed to download. Unstable connection or WEBP thumbnail not available.");
		}

		return true;
	} catch (error) {
		console.log(error.message.split("\n")[6] || error.message);
		return false;
	}
}

function verifyLibrary() {
	let fromAudios = fs.readdirSync("audios").map((el) => el.split(".")[0]);
	let fromThumbs = fs.readdirSync("thumbnails").map((el) => el.split(".")[0]);

	// Damn it .DS_Store
	fromAudios = fromAudios.filter((el) => el !== "");
	fromThumbs = fromThumbs.filter((el) => el !== "");

	const fromBoth = fromAudios.filter((el) => fromThumbs.includes(el));
	const missingAudioPair = fromThumbs.filter((el) => !fromBoth.includes(el));
	const missingThumbPair = fromAudios.filter((el) => !fromBoth.includes(el));

	const library = JSON.parse(
		fs.readFileSync("library.json", { encoding: "utf8" }),
	);
	const ids = Object.keys(library);
	ids.splice(ids.indexOf("order"), 1);

	let undocumentedFiles = fromAudios.filter((el) => !ids.includes(el));
	undocumentedFiles = undocumentedFiles.concat(
		...fromThumbs.filter((el) => !ids.includes(el)),
	);
	const missingFiles = ids.filter((el) => !fromBoth.includes(el));

	return [
		{
			missingAudioPair,
			missingThumbPair,
			undocumentedFiles,
			missingFiles,
		},
		library,
	];
}

export function getLibrary() {
	const check = verifyLibrary();
	if (Object.values(check[0]).flat().length !== 0) {
		console.log(check[0]);
		throw Error("Fragmented library status");
	}
	return check[1];
}

export async function forceFixLibrary(songList, library, songsDict, forceMap) {
	for (const entry of Object.entries(forceMap)) {
		if (entry[0] in library) {
			delete library[entry[0]];
			fs.unlinkSync(`audios/${entry[0]}.mp3`);
			fs.unlinkSync(`thumbnails/${entry[0]}.webp`);
			if (!(entry[1] in library) && !songList.includes(entry[1])) {
				songList.push(entry[1]);
				songsDict[entry[1]] = await getYTSong(entry[1]);
			}
		}
	}
}

export function getForceMap() {
	return JSON.parse(
		fs.readFileSync("internal/force-map.json", { encoding: "utf8" }),
	);
}

function sortLibrary(library) {
	const ids = Object.keys(library);
	ids.splice(ids.indexOf("order"), 1);

	library.order.bySong = ids.toSorted((id1, id2) => {
		const song1 = `${library[id1].song} by ${library[id1].artist}`;
		const song2 = `${library[id2].song} by ${library[id2].artist}`;
		return song1.localeCompare(song2);
	});

	library.order.byArtist = ids.toSorted((id1, id2) => {
		const song1 = `${library[id1].artist} by ${library[id1].song}`;
		const song2 = `${library[id2].artist} by ${library[id2].song}`;
		return song1.localeCompare(song2);
	});
}

export function saveLibrary(library) {
	for (const id in library) {
		if (id === "order") continue;
		const artistStr = `${library[id].artist} - `;
		if (library[id].song.startsWith(artistStr)) {
			library[id].song = library[id].song.slice(artistStr.length);
		}
		if (library[id].song.endsWith(artistStr)) {
			library[id].song = library[id].song.slice(0, -artistStr.length);
		}
	}

	sortLibrary(library);
	fs.writeFileSync("library.json", JSON.stringify(library), {
		encoding: "utf8",
	});
}

export function getSavedPlaylists() {
	return JSON.parse(fs.readFileSync("playlists.json", { encoding: "utf8" }));
}

export function savePlaylists(playlists) {
	fs.writeFileSync("playlists.json", JSON.stringify(playlists), {
		encoding: "utf8",
	});
}

export function addSavedPlaylist(playlistId) {
	const playlists = getSavedPlaylists();
	const i = playlists.youtube.findIndex((el) => el.playlistId === playlistId);
	if (i === -1) {
		playlists.youtube.push({ playlistId });
		savePlaylists(playlists);
	}
}

export function reportFailed(failedSongs) {
	fs.writeFileSync("internal/failed.json", JSON.stringify(failedSongs), {
		encoding: "utf8",
	});
	console.log(
		'You have songs that failed to download. Please check "internal/failed.json".',
	);
}

export function cleanup() {
	fs.rmSync("internal/temp", { recursive: true, force: true });
	fs.rmSync("internal/failed.json", { recursive: true, force: true });
}

export async function addSong(id) {
	const library = await getLibrary();
	const forceMap = getForceMap();
	// biome-ignore lint/style/noParameterAssign: it's stupid
	if (id in forceMap) id = forceMap[id];
	if (id in library) return true;
	const videoDet = await getYTSong(id);
	// biome-ignore lint/performance/noDelete: don't care enough
	delete videoDet.id;
	const successful = await downloadSong(id);
	cleanup();
	if (successful) {
		library[id] = videoDet;
		saveLibrary(library);
		console.log("Library updated.");
		return true;
	}
	console.log("Download failed.");
	return false;
}

export function deleteSong(id) {
	const library = getLibrary();
	delete library[id];
	saveLibrary(library);
	console.log("Library updated.");

	const playlists = getSavedPlaylists();
	for (const source in playlists) {
		for (const playlist of playlists[source]) {
			playlist.songs = playlist.songs.filter((song) => song !== id);
		}
	}
	savePlaylists(playlists);
	console.log("Playlists updated.");

	fs.unlinkSync(`audios/${id}.mp3`);
	fs.unlinkSync(`thumbnails/${id}.webp`);
	console.log("Songs deleted.");
}
