window.addEventListener("error", (e) => {
	alert(e.message);
});

// ----- Load Music Data -----
async function loadMusic() {
	try {
		window.library = await fetch("library.json").then((data) => data.json());
		window.playlists = await fetch("playlists.json").then((data) =>
			data.json(),
		);
		localStorage.setItem("library", JSON.stringify(library));
		localStorage.setItem("playlists", JSON.stringify(playlists));
	} catch {
		window.library = JSON.parse(localStorage.getItem("library"));
		window.playlists = JSON.parse(localStorage.getItem("playlists"));
	}

	// Save queue in localStorage on offload
	populateSongList(playlists.youtube[0].songs, true);
	populateSongList(library.order.bySong, false);
	populatePlaylists();

	for (const id of library.order.bySong) {
		searchDB.push({
			id,
			song: library[id].song,
			artist: library[id].artist,
		});
	}
}

loadMusic();

// fetch("/sync").then(async data => {
//   console.log(data.status);
//   console.log(await data.text());
// });

// fetch("/add-playlist", {
// 	method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
// 	body: JSON.stringify({ playlistId: "PLuvF8ytQv3mYDesp2YtuWMfQvW4VVyexX" }),
// }).then(async (data) => {
// 	console.log(data.status);
// 	console.log(await data.text());
// });

// fetch("/delete-song", {
// 	headers: {
// 		"Content-Type": "application/json",
// 	},
// 	method: "POST",
// 	body: JSON.stringify({ id: "oo__DzFqJBE" }),
// }).then(async (data) => {
// 	console.log(data.status);
// 	console.log(await data.text());
// });

// ----- Initialization -----
const $ = document.querySelectorAll.bind(document);
let audio = new Audio();

let firstPlay = true;

async function playSong() {
	const el = $(".queue-container .playing")[0];
	const song = el.dataset;

	audio.pause();

	$(".player .thumbnail-container img")[0].src = `thumbnails/${song.id}.webp`;
	$(".player .thumbnail-container img")[1].src = `thumbnails/${song.id}.webp`;
	$(".player .song-title")[0].innerText = song.song;
	$(".player .song-artist")[0].innerText = song.artist;

	$(".playlist-select-container .song-tab img")[0].src =
		`thumbnails/${song.id}.webp`;
	$(".playlist-select-container .song-tab img")[1].src =
		`thumbnails/${song.id}.webp`;
	$(".playlist-select-container .song-tab .song-title")[0].innerText =
		song.song;
	$(".playlist-select-container .song-tab .song-artist")[0].innerText =
		song.artist;

	audio = new Audio(`audios/${song.id}.mp3`);

	audio.addEventListener("loadeddata", () => {
		totalTimeEl.innerText = convertTime(audio.duration);
		audio.volume = 1;
	});

	const autoTag = $(".queue-container .auto")[0];
	const autoI = [...queueEl.children].indexOf(autoTag);
	const songI = [...queueEl.children].indexOf(el);
	if (songI > autoI) {
		const border = el.nextElementSibling;
		queueEl.insertBefore(autoTag.previousElementSibling, border);
		queueEl.insertBefore(autoTag, border);
	}

	try {
		if (firstPlay) {
			firstPlay = false;
		} else {
			await audio.play();
			if ("mediaSession" in navigator) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: song.song,
					artist: song.artist,
					artwork: [
						{
							src: `thumbnails/${song.id}.webp`,
							type: "image/webp",
						},
					],
				});
			}
		}
	} finally {
		audio.addEventListener("ended", () => {
			const inputEl = $(".queue-container .playing input")[0];
			if (inputEl.dataset.value === "1") return nextBtn.click();
			if (inputEl.dataset.value !== "∞") {
				inputEl.dataset.value -= 1;
			}
			if (document.activeElement !== inputEl && inputEl.value !== "∞") {
				inputEl.value -= 1;
				inputEl.size = Math.max(inputEl.value.length, 1);
			}
			playSong();
		});
	}
}

// ----- Player -----
const playBtn = $(".player .pause-play")[0];
const prevBtn = $(".player .previous")[0];
const nextBtn = $(".player .next")[0];
const queueEl = $(".queue-container .queue")[0];
const editorEl = $(".editor-container .editor")[0];

const currTimeEl = $(".player .current-time")[0];
const totalTimeEl = $(".player .total-time")[0];

const slider = $(".player .slider")[0];
let skipUpdate = false;

// Pause/play button
playBtn.addEventListener("click", () => {
	if (audio.paused) {
		audio.play();
	} else {
		audio.pause();
	}
});

// Restart OR previous song
prevBtn.addEventListener("click", () => {
	if (audio.currentTime < 5) {
		const songTabs = [...$(".queue-container .song-tab")];
		const i = songTabs.indexOf($(".queue-container .playing")[0]);

		if (i === 0) {
			return playSong();
		}

		songTabs[i].classList.remove("playing");
		songTabs[i - 1].classList.add("playing");
		playSong();
	} else {
		audio.currentTime = 0;
		slider.value = 0;
		currTimeEl.innerText = convertTime(0);
	}
});

// Next song
nextBtn.addEventListener("click", () => {
	const songTabs = [...$(".queue-container .song-tab")];
	const i = songTabs.indexOf($(".queue-container .playing")[0]);

	if (i === songTabs.length - 1) {
		return playSong();
	}

	songTabs[i].classList.remove("playing");
	songTabs[i + 1].classList.add("playing");
	playSong();

	if (dragging) {
		if (dragEls[1].classList.contains("playing")) {
			songTabClone.classList.add("playing");
		} else {
			songTabClone.classList.remove("playing");
		}
	}
});

navigator.mediaSession?.setActionHandler("previoustrack", () =>
	prevBtn.click(),
);
navigator.mediaSession?.setActionHandler("nexttrack", () => nextBtn.click());

// Use space to pause/play
document.addEventListener("keydown", (e) => {
	if (e.key === " " && !$(".overlay.search")[0] && !$(".overlay.popup")[0]) {
		e.preventDefault();
		playBtn.click();
	}

	if (dragging && e.key === "Escape") {
		queueEl.insertBefore(dragEls[0], dragEls[2]);
		queueEl.insertBefore(dragEls[1], dragEls[2]);
		document.dispatchEvent(
			new MouseEvent("mouseup", {
				clientX: mousePos[0],
				clientY: mousePos[1],
			}),
		);
	}

	if ($(".overlay.search")[0]) {
		if (e.key === "Escape") {
			$(".overlay")[0].classList.remove("search");
		}
		if (e.key === "ArrowDown") {
			const songTabs = [...$(".overlay .song-tab")];
			const currTab = $(".overlay .song-tab.playing")[0];
			let i = songTabs.indexOf(currTab);
			if (i === songTabs.length - 1) i = 0;
			else i++;
			currTab.classList.remove("playing");
			songTabs[i].classList.add("playing");
		}
		if (e.key === "ArrowUp") {
			const songTabs = [...$(".overlay .song-tab")];
			const currTab = $(".overlay .song-tab.playing")[0];
			let i = songTabs.indexOf(currTab);
			if (i === 0) i = songTabs.length - 1;
			else i--;
			currTab.classList.remove("playing");
			songTabs[i].classList.add("playing");
		}
		if (e.key === "Enter") {
			return $(".overlay .song-tab.playing")[0]?.click();
		}
	}

	if ($(".overlay.popup")[0]) {
		if (e.key === "Escape") {
			$(".overlay")[0].classList.remove("popup");
		}
		if (e.key === "Enter") {
			return $(".overlay .popup-container button")[0].click();
		}
	}

	if (document.activeElement.tagName === "INPUT" && e.key === "Enter") {
		document.activeElement.blur();
	}
});

// Slider changing
slider.addEventListener("input", () => {
	currTimeEl.innerText = convertTime(audio.currentTime);
	skipUpdate = true;
});

// Slider set
slider.addEventListener("change", () => {
	audio.currentTime = Number.parseInt(slider.value * audio.duration);
	currTimeEl.innerText = convertTime(audio.currentTime);
	skipUpdate = false;
});

function convertTime(num) {
	const parsedNum = Number.parseInt(num);
	const secs = parsedNum % 60;
	const mins = Number.parseInt(parsedNum / 60) % 60;
	const hrs = Number.parseInt(parsedNum / 3600);

	if (hrs === 0) return `${mins}:${secs.toString().padStart(2, 0)}`;
	return `${hrs}:${mins.toString().padStart(2, 0)}:${secs.toString().padStart(2, 0)}`;
}

// ----- Queue -----
let addBorder;

function populateSongList(songList, queue) {
	let appendDiv;
	if (queue) {
		appendDiv = queueEl;

		// Nothing to clear if populating queue for the first time
		if ($(".queue-container .playing")[0]) {
			shiftPlayingAboveAuto();

			// Clear queue
			const autoI = [...queueEl.children].indexOf(
				$(".queue-container .auto")[0],
			);
			for (const el of [...appendDiv.children].slice(autoI + 2)) el.remove();
		}
	} else {
		appendDiv = editorEl;

		// Clear song list
		for (const el of [...appendDiv.children].slice(2)) el.remove();
	}

	let div;
	for (const id of songList) {
		const song = {
			id,
			song: library[id].song,
			artist: library[id].artist,
		};

		div = document.createElement("div");
		div.classList.add("song-tab");

		div.dataset.id = song.id;
		div.dataset.song = song.song;
		div.dataset.artist = song.artist;

		if (queue) {
			div.innerHTML = `<div class="thumbnail-container"><img class="thumbnail-background" src="thumbnails/${song.id}.webp" loading="lazy"><img class="thumbnail" src="thumbnails/${song.id}.webp" loading="lazy"></div><div class="song-details"><div class="song-title">${song.song}</div><div class="song-artist">${song.artist}</div></div><div class="actions-container"><div class="repeat-container"><div class="repeat"></div><input value="1" data-value="1" size="1"></div><div class="actions"><div class="tag"></div><div class="delete"></div></div></div>`;
		} else {
			div.innerHTML = `<div class="thumbnail-container"><img class="thumbnail-background" src="thumbnails/${song.id}.webp" loading="lazy"><img class="thumbnail" src="thumbnails/${song.id}.webp" loading="lazy"></div><div class="song-details"><div class="song-title">${song.song}</div><div class="song-artist">${song.artist}</div></div><div class="actions-container"><div class="tag"></div><div class="delete"></div></div>`;
		}

		appendDiv.appendChild(div);

		div = document.createElement("div");
		div.classList.add("song-divider");
		div.innerHTML = `<div class="add"></div>`;
		appendDiv.appendChild(div);
	}

	if (!$(".queue-container .playing")[0]) {
		$(".queue-container .song-tab")[0].classList.add("playing");
		playSong();
	}
}

function shiftPlayingAboveAuto() {
	const currPlaying = $(".queue-container .playing")[0];
	const autoTag = $(".queue-container .auto")[0];
	const autoI = [...queueEl.children].indexOf(autoTag);
	const songI = [...queueEl.children].indexOf(currPlaying);
	if (songI > autoI) {
		const border = currPlaying.nextElementSibling;
		queueEl.insertBefore(autoTag.previousElementSibling, border);
		queueEl.insertBefore(autoTag, border);
	}
}

let lastInputClick = [0, null];

queueEl.addEventListener("click", (e) => {
	let { target } = e;
	if (target.classList.contains("add")) {
		addBorder = target.parentElement;
		$(".overlay")[0].classList.add("search");
		$(".overlay .search-bar")[0].focus();
		$(".overlay .search-bar")[0].select();
	} else if (
		target.classList.contains("repeat-container") ||
		target.parentElement.classList.contains("repeat-container")
	) {
		const inputEl = target.children[1] || target.parentElement.children[1];
		const currTime = new Date().getTime();
		if (currTime - lastInputClick[0] < 250 && lastInputClick[1] === inputEl) {
			inputEl.value = "";
			inputEl.focus();
		} else {
			if (inputEl.value === "1") inputEl.value = "2";
			else if (inputEl.value === "2") inputEl.value = "3";
			else if (inputEl.value === "3") inputEl.value = "∞";
			else inputEl.value = "1";

			inputEl.dataset.value = inputEl.value;
			inputEl.size = 1;
			lastInputClick = [currTime, inputEl];
		}
	} else if (target.classList.contains("tag")) {
		// Tags
	} else if (target.classList.contains("delete")) {
		target = target.parentElement.parentElement.parentElement;
		if (target.classList.contains("playing")) {
			const songTabs = [...$(".queue-container .song-tab")];
			const i = songTabs.indexOf(target);

			if (songTabs.length !== 1) {
				target.classList.remove("playing");
				if (i === songTabs.length - 1) {
					songTabs.at(-2).classList.add("playing");
				} else {
					songTabs[i + 1].classList.add("playing");
				}
				playSong();
			}
		}
		target.previousElementSibling.remove();
		target.remove();
	} else {
		while (!target.classList.contains("song-tab")) {
			if (target === queueEl) return;
			target = target.parentElement;
		}
		$(".queue-container .playing")[0]?.classList.remove("playing");
		target.classList.add("playing");
		playSong();
	}
});

// ----- Dragging Functionality -----
let mousedown = false;
let dragging = false;
let dragEls = [];
let scrollQueue = 0;
let dragStartPos = [];
let dragCloneOffset = [0, 0];
let mousePos = [0, 0];
let dragOverrides = [false, false];
const songTabClone = $(".song-tab.clone")[0];

// Dragging initialization
queueEl.addEventListener("mousedown", (e) => {
	dragEls = e.target;
	while (!dragEls.classList.contains("song-tab")) {
		if (dragEls === queueEl) {
			dragEls = [];
			return;
		}
		dragEls = dragEls.parentElement;
	}

	// Context menu triggered
	if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
		// Options:
		// - Delete
		//   - Delete above (click+w)
		//   - Delete below (click+s)
		// - Shuffle
		//   - Shuffle below playing (default [click], click+s)
		//   - Shuffle and move playing to top (click+w)
		// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
		return;
	}

	mousedown = true;
	dragStartPos = [e.clientX, e.clientY];
	dragCloneOffset = [
		dragEls.getBoundingClientRect().x - e.clientX,
		dragEls.getBoundingClientRect().y - e.clientY,
	];
	dragEls = [
		dragEls.previousElementSibling,
		dragEls,
		dragEls.nextElementSibling,
	];

	dragOverrides = [false, false];
	let bounds = queueEl.getBoundingClientRect();
	bounds = [
		bounds.x,
		bounds.x + bounds.width,
		bounds.y,
		bounds.y + bounds.height,
	];
	if (e.clientY < bounds[2] + 175) {
		dragOverrides[0] = true;
	}
	if (e.clientY > bounds[3] - 175) {
		dragOverrides[1] = true;
	}
});

// Disable default context menu
queueEl.addEventListener("contextmenu", (e) => e.preventDefault());

// Handles:
// - Add song buttons
// - Custom drag to reorder
// - Search for adding songs
document.addEventListener("mousemove", (e) => {
	// Search for adding songs
	if (!mousedown && $(".overlay.search")[0]) {
		target = e.target;
		while (!target.classList.contains("song-tab")) {
			if (target === document.body) return;
			target = target.parentElement;
		}

		$(".overlay .playing")[0].classList.remove("playing");
		target.classList.add("playing");
	}

	// Check if accidental-drag-click or actual drag
	let draggingOneTime = false;
	if (
		mousedown &&
		!dragging &&
		Math.hypot(dragStartPos[0] - e.clientX, dragStartPos[1] - e.clientY) > 15
	) {
		dragging = draggingOneTime = true;
	}

	// Dragging visual setup
	if (draggingOneTime) {
		songTabClone.innerHTML = dragEls[1].innerHTML;
		dragEls[1].classList.add("dragging");
		songTabClone.classList.add("show");

		if (dragEls[1].classList.contains("playing"))
			songTabClone.classList.add("playing");
		else songTabClone.classList.remove("playing");
	}

	// Custom drag to reorder
	if (dragging) {
		mousePos = [e.clientX, e.clientY];

		const transX = mousePos[0] + dragCloneOffset[0];
		const transY = mousePos[1] + dragCloneOffset[1];
		songTabClone.style = `transform: translate(${transX}px, ${transY}px);`;
		let bounds = queueEl.getBoundingClientRect();
		bounds = [
			bounds.x,
			bounds.x + bounds.width,
			bounds.y,
			bounds.y + bounds.height,
		];

		if (mousePos[1] > bounds[2] + 175) {
			dragOverrides[0] = false;
		}
		if (mousePos[1] < bounds[3] - 175) {
			dragOverrides[1] = false;
		}
		if (dragStartPos[1] - 15 > mousePos[1]) {
			dragOverrides[0] = false;
		}
		if (dragStartPos[1] + 15 < mousePos[1]) {
			dragOverrides[1] = false;
		}
		if (mousePos[1] < bounds[2] || mousePos[1] > bounds[3]) {
			dragOverrides = [false, false];
		}

		scrollQueue = 0;
		if (mousePos[0] > bounds[0] - 100 && mousePos[0] < bounds[1] + 100) {
			if (!dragOverrides[0]) {
				if (mousePos[1] < bounds[2] + 175) {
					scrollQueue = -1;
				}
				if (mousePos[1] < bounds[2] + 100) {
					scrollQueue = -2;
				}
				if (mousePos[1] < bounds[2] + 25) {
					scrollQueue = -4;
				}
				if (mousePos[1] < bounds[2]) {
					scrollQueue = -15;
				}
			}
			if (!dragOverrides[1]) {
				if (mousePos[1] > bounds[3] - 175) {
					scrollQueue = 1;
				}
				if (mousePos[1] > bounds[3] - 100) {
					scrollQueue = 2;
				}
				if (mousePos[1] > bounds[3] - 25) {
					scrollQueue = 4;
				}
				if (mousePos[1] > bounds[3]) {
					scrollQueue = 15;
				}
			}

			let droppable = [...$(".queue-container .song-divider")];
			droppable.splice(droppable.indexOf(dragEls[0]), 1);
			droppable = droppable.splice(
				Math.max(0, Number.parseInt(queueEl.scrollTop / 71)),
				10,
			);
			for (const el of droppable) {
				if (Math.abs(el.getBoundingClientRect().y - e.clientY) < 25) {
					queueEl.insertBefore(dragEls[0], el);
					queueEl.insertBefore(dragEls[1], el);
				}
			}
		}
	} else {
		// Show/hide add song button
		let droppable = [...$(".queue-container .song-divider")];
		droppable = droppable.splice(
			Math.max(0, Number.parseInt(queueEl.scrollTop / 71)),
			10,
		);
		for (const el of droppable) {
			const withinWidth =
				Math.abs(el.getBoundingClientRect().x + 150 - e.clientX) < 75;
			const withinHeight =
				Math.abs(el.getBoundingClientRect().y - e.clientY) < 25;
			if (withinWidth && withinHeight) {
				el.classList.add("mouseover");
			} else {
				el.classList.remove("mouseover");
			}
		}
	}
});

document.addEventListener("mouseup", () => {
	dragEls[1]?.classList.remove("dragging");
	songTabClone.classList.remove("show");
	mousedown = dragging = false;
	scrollQueue = 0;
});

queueEl.addEventListener("mouseleave", () => {
	for (const el of $(".queue-container .song-divider.mouseover")) {
		el.classList.remove("mouseover");
	}
});

let lastValidInput = "1";
queueEl.addEventListener("input", (e) => {
	strVal = e.target.value;
	if (strVal.length > 2) {
		e.target.value = lastValidInput;
	} else if (strVal === "" || !Number.isNaN(Number(strVal))) {
		lastValidInput = strVal;
	} else if (strVal.at(-1) === "i") {
		e.target.value = lastValidInput = "∞";
	} else {
		e.target.value = lastValidInput;
	}
	e.target.dataset.value = lastValidInput || "1";
	e.target.size = Math.max(e.target.value.length, 1);
});

queueEl.addEventListener("focusout", (e) => {
	if (e.target.tagName !== "INPUT") return;
	if (e.target.value === "") e.target.value = "1";
	e.target.dataset.value = e.target.value;
});

// ----- Search -----
const searchRes = $(".overlay .search-results")[0];
const searchDB = [];

$(".overlay .search-bar")[0].addEventListener("input", (e) => {
	searchRes.innerHTML = "";

	const fuse = new window.Fuse(searchDB, {
		keys: ["song", "artist"],
	});

	const searchResList = fuse.search(e.target.value).map((el) => el.item);

	if (searchResList.length > 0) {
		for (const song of searchResList) {
			div = document.createElement("div");
			div.classList.add("song-tab");

			div.dataset.id = song.id;
			div.dataset.song = song.song;
			div.dataset.artist = song.artist;

			div.innerHTML = `<div class="thumbnail-container"><img class="thumbnail-background" src="thumbnails/${song.id}.webp" loading="lazy"><img class="thumbnail" src="thumbnails/${song.id}.webp" loading="lazy"></div><div class="song-details"><div class="song-title">${song.song}</div><div class="song-artist">${song.artist}</div></div>`;

			searchRes.appendChild(div);

			div = document.createElement("div");
			div.classList.add("song-divider");
			searchRes.appendChild(div);
		}
		searchRes.children[0]?.classList.add("playing");
	} else {
		searchRes.innerHTML = `<div class="placeholder">Press <kbd>Esc</kbd> to cancel.</div>`;
	}
});

$(".overlay")[0].addEventListener("click", (e) => {
	let { target } = e;
	if (target.classList.contains("overlay")) {
		target.classList.remove("search");
		target.classList.remove("popup");
		return;
	}

	if ($(".overlay.search")[0]) {
		// Find song tab
		while (!target.classList.contains("song-tab")) {
			if (
				target.classList.contains("search-results-container") ||
				target.classList.contains("search-bar")
			)
				return;
			target = target.parentElement;
		}
		$(".overlay")[0].classList.remove("search");

		// Copy over song tab
		border = target.nextElementSibling.cloneNode();
		target = target.cloneNode(true);
		target.classList.remove("playing");
		border.innerHTML = `<div class="add"></div>`;

		// Add action buttons
		const div = document.createElement("div");
		div.classList.add("actions-container");
		div.innerHTML = `<div class="repeat-container"><div class="repeat"></div><input value="1" data-value="1" size="1"></div><div class="actions"><div class="tag"></div><div class="delete"></div>`;
		target.appendChild(div);

		// Insert copied song tab
		queueEl.insertBefore(border, addBorder);
		queueEl.insertBefore(target, addBorder);
	}

	if ($(".overlay.popup")[0] && target.tagName === "BUTTON") {
		popupAction($(".overlay .popup-container input")[0].value);
		$(".overlay")[0].classList.remove("popup");
	}
});

// ----- Toggle playlist editor -----
$(".nav .to-queue")[0].addEventListener("click", () => {
	$(".slider-container")[0].classList.add("active");
});

$(".nav .to-editor")[0].addEventListener("click", () => {
	$(".slider-container")[0].classList.remove("active");
});

$(".nav .jump")[0].addEventListener("click", () => {
	$(".queue-container .playing")[0].scrollIntoViewIfNeeded();
});

// -------------------- Playlist Editor --------------------

// ----- Secondary Player -----
const playBtn2 = $(".playlist-select-container .song-tab .pause-play")[0];
const prevBtn2 = $(".playlist-select-container .song-tab .previous")[0];
const nextBtn2 = $(".playlist-select-container .song-tab .next")[0];
const YTPlaylistsEl = $(".playlist-select-container .youtube")[0];
const localPlaylistsEl = $(".playlist-select-container .local")[0];

playBtn2.addEventListener("click", () => playBtn.click());
prevBtn2.addEventListener("click", () => prevBtn.click());
nextBtn2.addEventListener("click", () => nextBtn.click());

let popupAction;

function populatePlaylists() {
	for (const source in playlists) {
		const playlistEl = $(`.playlist-select-container .${source}`)[0];
		for (const el of [...playlistEl.children].slice(1)) el.remove();

		for (const playlist of playlists[source]) {
			const div = document.createElement("div");
			div.classList.add("playlist");
			div.innerHTML = `<div class="name" data-playlist-id="${playlist.playlistId}">${playlist.playlistName}</div><div class="play"></div>`;
			playlistEl.appendChild(div);

			div.addEventListener("click", (e) => {
				if (e.target.classList.contains("play")) {
					const i = [...playlistEl.children].indexOf(div) - 1;
					populateSongList(playlists[source][i].songs, true);
					$(".slider-container")[0].classList.add("active");
				} else {
					const editor = $(".editor-container .editor")[0];
					editor.classList.remove("library");
					editor.classList.remove("youtube");
					editor.classList.remove("local");
					editor.classList.add(source);

					$(".editor-container .playlist-title-container span")[0].innerText =
						playlist.playlistName;
					editor.children[1].style.marginTop = `${editor.children[0].clientHeight - 1}px`;

					const i = [...playlistEl.children].indexOf(div) - 1;
					populateSongList(playlists[source][i].songs, false);
				}
			});
		}
	}
}

$(".playlist-select-container .library")[0].addEventListener("click", (e) => {
	const orderType = $(".editor-container .playlist-options select")[0].value;

	if (e.target.classList.contains("play")) {
		populateSongList(library.order[orderType], true);
		$(".slider-container")[0].classList.add("active");
	} else {
		const editor = $(".editor-container .editor")[0];
		editor.classList.add("library");
		editor.classList.remove("youtube");
		editor.classList.remove("local");

		$(".editor-container .playlist-title-container span")[0].innerText =
			"My Library";
		editor.children[1].style.marginTop = `${editor.children[0].clientHeight - 1}px`;
		populateSongList(library.order[orderType], false);
	}
});

$(".playlist-select-container .youtube .sync")[0].addEventListener(
	"click",
	() => {
		fetch("/playlists-sync").then(async (data) => {
			if (data.status !== 200) {
				alert("Operation failed. Please check console.");
				console.log(await data.text());
			}
		});
	},
);

$(".playlist-select-container .youtube .add")[0].addEventListener(
	"click",
	() => {
		$(".overlay .popup-container .popup-description")[0].innerText =
			"Please copy and paste your YouTube playlist URL or ID.";

		$(".overlay")[0].classList.add("popup");
		popupAction = addPlaylistAPI;
	},
);

$(".editor-container .playlist-options select")[0].addEventListener(
	"change",
	(e) => {
		populateSongList(library.order[e.target.value], false);
	},
);

$(".editor-container .playlist-options .add")[0].addEventListener(
	"click",
	() => {
		$(".overlay .popup-container .popup-description")[0].innerText =
			"Please copy and paste your song URL or song ID.";

		$(".overlay")[0].classList.add("popup");
		popupAction = addSongAPI;
	},
);

async function addPlaylistAPI(inputData) {
	// Extract playlist ID
	let playlistId = inputData.split("/");
	if (playlistId.length === 36) playlistId = playlistId.slice(2);
	if (playlistId.length !== 34) {
		if (playlistId.at(-2) === "browse")
			playlistId = playlistId
				.at(-1)
				.match(/[a-z0-9_-]+/i)[0]
				.slice(2);
		else {
			playlistId = playlistId.at(-1).match(/[&?]list=([a-z0-9_-]+)/i)[1];
		}

		if (playlistId.length !== 34) {
			throw new Error("Invalid link or ID entered.");
		}
	}

	const data = await fetch("/add-playlist", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ playlistId }),
	});

	if (data.status === 200) {
		window.library = await fetch("library.json").then((data) => data.json());
		window.playlists = await fetch("playlists.json").then((data) =>
			data.json(),
		);
		// Repopulate (playlist-select-container & editor-container)
		populatePlaylists();
	} else {
		alert("Operation failed. Please check console.");
		console.log(await data.text());
	}
}

async function addSongAPI(inputData) {
	const data = await fetch("/add-playlist");
	if (data.status === 200) {
		window.library = await fetch("library.json").then((data) => data.json());
		window.playlists = await fetch("playlists.json").then((data) =>
			data.json(),
		);
		// Repopulate (playlist-select-container & editor-container)
	} else {
		alert("Operation failed. Please check console.");
		console.log(await data.text());
	}
}

// -------------------- Constantly Updating --------------------
setInterval(() => {
	// Update slider and time
	if (skipUpdate) return;
	slider.value = audio.currentTime / audio.duration || 0;
	currTimeEl.innerText = convertTime(audio.currentTime);
	if (audio.paused) {
		playBtn.classList.add("active");
		playBtn2.classList.add("active");
	} else {
		playBtn.classList.remove("active");
		playBtn2.classList.remove("active");
	}
}, 100);

setInterval(() => {
	// Dragging functionality
	if (!dragging || scrollQueue === 0) return;
	queueEl.scrollTop += scrollQueue * 10;

	let droppable = [...$(".queue-container .song-divider")];
	droppable.splice(droppable.indexOf(dragEls[0]), 1);
	droppable = droppable.splice(
		Math.max(0, Number.parseInt(queueEl.scrollTop / 71)),
		10,
	);
	for (const el of droppable) {
		const withinHeight =
			Math.abs(el.getBoundingClientRect().y - mousePos[1]) < 25;
		if (withinHeight) {
			queueEl.insertBefore(dragEls[0], el);
			queueEl.insertBefore(dragEls[1], el);
		}
	}
}, 50);
