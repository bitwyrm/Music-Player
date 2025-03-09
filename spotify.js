import { getLibrary } from "./internal/library-manager.js";
import SpotifyWebApi from "spotify-web-api-node";

const spotifyApi = new SpotifyWebApi({
	redirectUri: "http://localhost/spotify-auth",
	clientId: "3a69e7849931483c8cdab7297199d98d",
	accessToken:
		"BQCtS38v5JBo9wRK9aJwz1Lr4sJ7Pc8V04SETdX070nZ6W8IX5VUaJ-Zz9KXamIn8E_7YK0kpknXFAfnNPHIBkIZawEtAefmFjY82JXMOjxVN0a5eMUdOCF3G3nCjNPKFj0hp9mq1l03GYYbryq2Zq8hspC9ZPk1-ew2Yn-6JHmojG9OYnZoCG_rnh36YCp6_cTcbMSkMvcvS_7aWiViNNw",
});

export async function authorizeSpotify() {
	return spotifyApi.createAuthorizeURL(
		["playlist-read-private", "playlist-read-collaborative"], //scopes
		"authorizing", // state
		true, // showDialog
		"token",
	);
}

async function fetchSpotifyPlaylist(playlistSpotifyId, accessToken) {
	accessToken && spotifyApi.setAccessToken(accessToken);

	let res = await spotifyApi.getPlaylist(playlistSpotifyId);
	const playlistName = res.body.name;
	let songs = res.body.tracks.items;
	res = res.body.tracks;

	while (res.next) {
		res = await spotifyApi.getPlaylistTracks(playlistSpotifyId, {
			offset: 100,
			limit: 100,
		});
		res = res.body;
		songs = songs.concat(...res.items);
	}

	songs = songs.map((el) => {
		const artists = el.track.artists.map((el) => el.name);
		let song = el.track.name;
		if (song.match(/\(.+\)/)?.length === 1) {
			const parentheses = song.match(/\(.+\)/)[0];
			const artistInParentheses = artists.some((artist) =>
				parentheses.includes(artist),
			);
			if (song.endsWith(parentheses) && artistInParentheses) {
				song = song.slice(0, -parentheses.length).trim();
			}
		}

		return {
			spotifyId: el.track.id,
			song: el.track.name,
			artists,
		};
	});

	console.log(songs.slice(0, 5));

	return {
		playlistId: playlistSpotifyId,
		playlistName,
		songs,
	};
}

async function translateSpotifyPlaylist(spotifyPlaylist) {
	// getLibrary();
}

export async function getSpotifyPlaylist(playlistSpotifyId, accessToken) {
	const spotifyPlaylist = await fetchSpotifyPlaylist(
		playlistSpotifyId,
		accessToken,
	);
	const translatedPlaylist = translateSpotifyPlaylist(spotifyPlaylist);
}

// console.log(authorizeSpotify());
getSpotifyPlaylist("4rCfKhf8eRQP0fMxJ88afI");
