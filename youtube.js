import process from "node:process";
import YTMusic from "ytmusic-api";
process.removeAllListeners("warning");

const youtubeApi = new YTMusic();
await youtubeApi.initialize();

// Remove duplicates
// artists
// artist
// creators
// creator
// channel
// uploader

// title
// track

// duration

// album


function fixMessy(song, artists) {
	const coArtist = song.match(/\(feat\..+\)$/)?.[0];
	if (coArtist !== undefined)
		artists.push(coArtist.replace("(feat.", "").replace(/\)$/, "").trim());

	// biome-ignore lint/style/noParameterAssign: it's stupid
	song = song.split(/\(feat\..+\)$/)[0].trim();

	// biome-ignore lint/style/noParameterAssign: it's stupid
	artists = artists
		.map((artist) => artist.trim())
		.filter(
			(row, i, arr) => arr.slice(0, i).findIndex((l) => l === row) === -1,
		);

	return [song, artists];
}

export async function searchSong(song, artists, originFromSpotify) {
	// biome-ignore lint/style/noParameterAssign: it's stupid
	song = song.trim();
	// biome-ignore lint/style/noParameterAssign: it's stupid
	[song, artists] = fixMessy(song, artists);
	console.log(song);
	console.log(artists);

	let res = await youtubeApi.searchSongs(`${song} by ${artists.join(", ")}`);
  console.log(res[0])
	res = res.map((el) => {
		return {
			id: el.videoId,
			song: el.name,
			artist: el.artist.name,
		};
	});

	let retVal = res.find((el) => {
		const correctSong = el.song.includes(song);
		const correctArtist = artists.some((artist) => el.artist.includes(artist));
		return correctSong && correctArtist;
	});

	if (retVal) {
		return {
			id: retVal.id,
			song,
			artist: artists.join(", "),
		};
	}

	res = await youtubeApi.searchVideos(`${song} by ${artists.join(", ")}`);
	res = res.map((el) => {
		return {
			id: el.videoId,
			song: el.name,
			artist: el.artist.name,
		};
	});

	retVal = res.find((el) => {
		const correctSong = el.song.includes(song);
		const correctArtist = artists.some(
			(artist) => el.artist.includes(artist) || el.song.includes(artist),
		);
		return correctSong && correctArtist;
	});

	if (retVal) {
		return {
			id: retVal.id,
			song,
			artist: artists.join(", "),
		};
	}

	return res[0];
}

console.log(
	await searchSong(
		"ME TO A STRANGER (with MOTHICA) (feat. MOTHICA)",
		["Heather Sommer", "MOTHICA", "Adam Turley", "Heather Sommer"],
		true,
	),
);
