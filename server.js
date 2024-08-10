import express from "express";
import fs from "node:fs";
import {
	addSong,
	deleteSong,
	getLibrary,
	saveLibrary,
} from "./internal/library-manager.js";
import { addYoutubePlaylist, syncYoutubePlaylists } from "./internal/sync.js";
const app = express();
const { dirname } = import.meta;

if (!fs.existsSync("audios")) {
	fs.mkdirSync("audios");
}

if (!fs.existsSync("thumbnails")) {
	fs.mkdirSync("thumbnails");
}

if (!fs.existsSync("library.json")) {
	fs.writeFileSync(
		"library.json",
		JSON.stringify({ order: { bySong: [], byArtist: [] } }, null, 2),
	);
}

if (!fs.existsSync("playlists.json")) {
	fs.writeFileSync("playlists.json", JSON.stringify({ youtube: [] }, null, 2));
}

if (!fs.existsSync("internal/force-map.json")) {
	fs.writeFileSync("internal/force-map.json", JSON.stringify({}, null, 2));
}

// Auto-sync if connected to internet
// Otherwise order library
syncYoutubePlaylists().catch((err) => {
	console.log("Error");
	console.error(err);
	saveLibrary(getLibrary());
});

app.use(express.json());
app.use("/audios", express.static("audios"));
app.use("/images", express.static("images"));
app.use("/thumbnails", express.static("thumbnails"));

app.get("/playlists-sync", async (req, res) => {
	try {
		if (req?.body?.playlistId) {
			await syncYoutubePlaylists(req.body.playlistId);
		} else {
			await syncYoutubePlaylists();
		}
		res.send("Success");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.get("/library-sync", (_, res) => {
	try {
		saveLibrary(getLibrary());
		res.send("Success");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.get("/song-update", (req, res) => {
	try {
		if (!req?.body?.id || !req?.body?.song || !req?.body?.artist)
			throw new Error("Must provide song ID, song name, and artist name.");
		const library = getLibrary();
		library[req.body.id] = {
			id: req.body.id,
			song: req.body.song,
			artist: req.body.artist,
		};
		saveLibrary(library);
		res.send("Success");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.post("/add-playlist", async (req, res) => {
	try {
		await addYoutubePlaylist(req.body.playlistId);
		res.send("Added playlist successfully");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.post("/add-song", async (req, res) => {
	try {
		await addSong(req.body.id);
		res.send("Added song successfully.");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.post("/delete-song", async (req, res) => {
	try {
		deleteSong(req.body.id);

		const logData = `${req.body.id} video deleted (${new Date().toLocaleString()}, ${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
		console.log(logData);
		fs.appendFileSync("internal/delete-log.txt", `\n${logData}`);

		res.send("Deleted song successfully.");
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.get("/player", (_, res) => res.sendFile(`${dirname}/player.html`));
app.get("/favicon.ico", (_, res) =>
	res.sendFile(`${dirname}/images/favicon.ico`),
);
app.get("/:file", (req, res) => res.sendFile(`${dirname}/${req.params.file}`));

app.listen(80);
