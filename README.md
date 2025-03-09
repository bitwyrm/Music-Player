# To Use

- Install [yt-dlp](https://github.com/yt-dlp/yt-dlp)
  - Test: open your terminal and type in `yt-dlp --version`
- Make sure you have NodeJS installed
  - Test: open your terminal and type in `node --version` & `npm --version`
- Run `npm i` to install dependencies
- Run `node server.js`
- That's it!

# To Do

- Get lyrics from AZLyrics.com

Persistent search screen

Integrate with spotify to youtube

- https://www.npmjs.com/package/spotify-web-api-node

Use youtube music API
https://www.npmjs.com/package/ytmusic-api

Delete functionality

- Permanent delete (when .library)
- Edit local playlists
  "DELETE THIS" song

Fix images (square or contain)

Control+F hide during transition
Filter library for songs not in playlists
When adding, options to add below or above queue
Context menus (x2)

- Queue
  - Clear below
  - Clear above
  - Shuffle (how?)
- Playlist select
  - Delete playlist
  - Where to add in queue

Figure out adding in local playlists
Save local playlists whenever shit is added or dragged

Multi-select songs in playlist (ctrl/cmd+click?)

Select playlist when clicked on it (via classes)

Add durations
Expand song name and artist name on hover

Filter out artist name with brackets (careful of "feat." and "with")
If already in youtube library, use it
Otherwise search top 10
Try to match song name and artist name
If unmatched, download from youtube

- No "lyrics" or "music video"
- No "music video"
- Just whatever shows up

After adding song, update fuzzy searching

Add force-map to UI

Fix dragging UI for queue (width is too high)

Account for `audio.duration` being `NaN` when setting slider
filter: blur(0) on playing to put on top
padding left instead of margin left on .queue

Fix error when adding playlist which is private

Fix addPlaylistAPI and add song functionality

Fix error checking (`getLibrary`)

Fix wifi interruptions (audio downloaded but not thumbnail)

Fix with jpg downloaded instead of webp

Delete song if in force mappings

Left (opaque) panel add padding on top of currentply playing song

Don't try failed files persistently