# Music Player App - Full Specification

## 1. Overview

This project is a cross-platform music player app designed for desktop (Windows, Mac, Linux), mobile (Android, iOS), and optionally the web. The app provides:

- Unified UI across platforms via Flutter  
- Music library management with local caching of songs  
- Playlist generation with advanced mood/artist/tempo transitions  
- Lyrics fetching and timestamp alignment  
- Background playback on mobile devices  
- Syncing of user state and metadata with a backend server  
- Support for playlists sourced from YouTube and Spotify  

The backend is a Node.js + Express server handling metadata, ML processing, lyrics fetching, and serving song files. The frontend is Flutter-based and focuses on UI, playback, caching, and local storage management.

---

## 2. Architecture Diagram

[User Device (Flutter App)] <--> [NodeJS Backend + DB + yt-dlp + ML] <--> [Filesystem: Songs + Data Files]

- The frontend caches songs locally on devices (file system or IndexedDB on web).  
- The backend maintains the master database with canonical song IDs, metadata, playlists, and ML-generated features.  
- The backend fetches songs using yt-dlp and stores them on disk.  
- Lyrics fetching, timestamp alignment, and audio feature extraction are done asynchronously on the backend.  
- The frontend syncs user metadata (play counts, listening stats, playlist reorderings) with the backend to allow continuation across devices.  
- The backend is stateless regarding playback position, only maintaining user metadata snapshots.

---

## 3. Tech Stack Summary

| Layer          | Technology / Library                           | Notes                                                                 |
|----------------|-----------------------------------------------|----------------------------------------------------------------------|
| Frontend       | Flutter                                       | Cross-platform UI, desktop/mobile support, background audio playback |
| Backend        | Node.js + Express                             | API server, handles ML, lyrics fetching, playlist generation         |
| Database       | SQLite (file-based)                           | Persistent local DB, low footprint, supports SQL queries             |
| Storage        | Filesystem (songs + metadata JSON files)     | Songs stored by unique ID; metadata synced with DB                   |
| Lyrics Fetch   | Custom scrapers + ML alignment on backend    | Fetch lyrics from multiple free sources, align timings               |
| Audio Feature Extraction | Python audio libs (librosa, Essentia, etc) | Offline asynchronous ML extraction of tempo, key, genre, mood       |
| Sync Protocol  | RESTful JSON APIs                             | Sync play counts, playlists, user preferences                        |

---

## 4. High-Level Workflow

### Frontend

- On launch, sync user metadata from backend.  
- Load playlists and song metadata from local DB/cache.  
- Play songs using native audio player plugins; cache new songs as requested.  
- Detect user interactions (playlist reorder, play count increment).  
- On song change or user update, sync updated metadata with backend.  
- Provide UI for playlist generation and mood selection.  
- Allow folder selection for song storage on desktop (flutter_file_picker or similar).  
- Prevent song data syncing with cloud backups (e.g., iCloud/Google backup exclusions).

### Backend

- Store all canonical song info with unique internal IDs.  
- Manage mappings between Spotify and YouTube song IDs to internal IDs.  
- Store playlists and user metadata in SQLite.  
- When a new song appears, run async jobs to:  
  - Download audio using yt-dlp  
  - Extract audio features (tempo, key, genre, etc.)  
  - Fetch lyrics from multiple sources  
  - Align lyrics with audio timestamps using ML algorithms  
- Expose REST API for frontend sync and playlist generation.  
- Handle conflict resolution when multiple playlists or reordered lists are synced.  
- Maintain sliding window of recent user stats for “wrapped” style features.

---

## 5. Data Handling & Consistency

- Frontend holds local state for cached songs and user interactions.  
- Sync with backend happens at: song change, user interaction, playlist update.  
- Backend merges incoming metadata with existing DB entries; handles conflicts by timestamp and source priority.  
- Original playlists stored in DB are immutable; reordered or temporary playlists stored as separate snapshots with references to originals.  
- Unique IDs ensure song deduplication; fuzzy matching algorithms employed to link Spotify/YouTube sources.

---

## 6. User Data Privacy and Backup Considerations

- Local cached songs and metadata are stored in app-specific folders excluded from cloud backups on mobile platforms.  
- User listening data synced only on explicit sync events to minimize network usage.  
- Backend is designed to be low-footprint and run on a personal machine or small VPS.  

---

## 7. Unique ID Management

- Internal canonical IDs assigned per song (not raw YouTube or Spotify IDs).  
- Metadata contains mappings:  
  - `internal_id -> {spotify_id, youtube_id, other_ids}`  
  - This ensures unique identity despite multiple sources or versions.  
- YouTube source ID selection uses YouTube Music search with best match heuristics (first relevant result after filtering by song title and artist).  

---

## 8. Playlist Generation Approach (Summary)

- Latent space embeddings combining audio features (tempo, key, genre) and lyric features (sentiment, topic modeling).  
- User-defined mood blends and transition times control the generation.  
- Stochastic random walk algorithm in latent space for smooth transitions.  
- Playlist length control with adjustable time ranges; dynamic update if user changes duration mid-playback.  
- User can inject songs manually; generator respects manual inserts and updates recommendations around them.

---

## 9. API Overview

### User Sync

- `GET /user/data` — Fetch user metadata and playlists  
- `POST /user/data` — Upload updated user metadata (play counts, reorderings)  

### Playlist Management

- `GET /playlists` — Fetch all playlists  
- `POST /playlists` — Create new playlist  
- `PUT /playlists/{id}` — Update playlist (reordering, additions)  

### Song Metadata

- `GET /songs/{id}` — Fetch song metadata including features and lyrics  
- `POST /songs` — Upload new song metadata (admin/backend use)  

### Lyrics and Features

- `GET /songs/{id}/lyrics` — Fetch synced lyrics  
- `GET /songs/{id}/features` — Fetch audio and lyric features  

### Playlist Generation

- `POST /playlist/generate` — Generate a playlist based on moods, artists, and duration parameters  

---

## 10. Database Schema

Using SQLite for persistent storage. Below are the core tables and their relationships.

### Tables

---

### 10.1 Songs Table

| Column          | Type        | Description                                             |
|-----------------|-------------|---------------------------------------------------------|
| internal_id     | TEXT (PK)   | Unique internal ID for the song                          |
| spotify_id      | TEXT        | Optional Spotify song ID                                 |
| youtube_id      | TEXT        | Optional YouTube video/song ID                           |
| title           | TEXT        | Song title                                              |
| artist          | TEXT        | Primary artist name                                     |
| album           | TEXT        | Album name (optional)                                   |
| duration_ms     | INTEGER     | Duration in milliseconds                                |
| genre           | TEXT        | Primary genre (optional)                                |
| key             | INTEGER     | Musical key (0-11, C=0)                                |
| tempo           | REAL        | BPM                                                     |
| lyrics          | TEXT        | Raw lyrics text (optional)                             |
| lyrics_aligned  | TEXT (JSON) | Lyrics with timestamp alignment JSON (optional)        |
| date_added      | TIMESTAMP   | Date song was added to library                           |

---

### 10.2 Playlists Table

| Column          | Type        | Description                                             |
|-----------------|-------------|---------------------------------------------------------|
| playlist_id     | TEXT (PK)   | Unique playlist identifier                              |
| name            | TEXT        | Playlist display name                                  |
| source          | TEXT        | Source of playlist: 'youtube', 'spotify', 'user', etc  |
| date_created    | TIMESTAMP   | Creation timestamp                                     |
| is_original     | BOOLEAN     | Whether this is an original immutable playlist          |

---

### 10.3 PlaylistSongs Table (Mapping songs to playlists)

| Column          | Type        | Description                                             |
|-----------------|-------------|---------------------------------------------------------|
| id              | INTEGER (PK)| Auto-increment                                          |
| playlist_id     | TEXT (FK)   | Foreign key to Playlists.playlist_id                    |
| song_id         | TEXT (FK)   | Foreign key to Songs.internal_id                         |
| position        | INTEGER     | Position of the song in the playlist                     |

---

### 10.4 UserMetadata Table

| Column          | Type        | Description                                             |
|-----------------|-------------|---------------------------------------------------------|
| user_id         | TEXT (PK)   | Unique user identifier                                  |
| song_id         | TEXT (FK)   | Song internal_id                                        |
| play_count      | INTEGER     | Number of times user played the song                   |
| last_played     | TIMESTAMP   | Last played timestamp                                  |
| minutes_listened| INTEGER     | Total minutes listened                                  |
| rating          | INTEGER     | User rating for the song (optional)                     |

---

### 10.5 UserPlaylists Table (User-specific playlist snapshots)

| Column          | Type        | Description                                             |
|-----------------|-------------|---------------------------------------------------------|
| id              | INTEGER (PK)| Auto-increment                                          |
| user_id         | TEXT (FK)   | User identifier                                        |
| playlist_id     | TEXT (FK)   | Original playlist ID                                   |
| snapshot_data   | TEXT (JSON) | JSON representing reordered or modified playlist       |
| last_modified   | TIMESTAMP   | Timestamp of last update                               |

---

## 11. Data Formats

### 11.1 Song Metadata JSON (frontend/backend communication)

```
{
  "internal_id": "song12345",
  "spotify_id": "spotify:track:xyz",
  "youtube_id": "U2j3xv7xWis",
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "duration_ms": 210000,
  "genre": "House",
  "key": 0,
  "tempo": 120.5,
  "lyrics": "Full raw lyrics string",
  "lyrics_aligned": [
    { "timestamp_ms": 0, "line": "First line" },
    { "timestamp_ms": 12000, "line": "Second line" }
  ],
  "date_added": "2024-08-10T12:00:00Z"
}
```

---

### 11.2 Playlist JSON (frontend/backend communication)

```
{
  "playlist_id": "PL123456",
  "name": "Standard Playlist",
  "source": "youtube",
  "songs": [
    { "internal_id": "song12345", "position": 1 },
    { "internal_id": "song67890", "position": 2 }
  ],
  "date_created": "2024-08-10T12:00:00Z",
  "is_original": true
}
```

---

### 11.3 User Metadata Sync JSON

```
{
  "user_id": "user123",
  "play_counts": {
    "song12345": 10,
    "song67890": 5
  },
  "last_played": {
    "song12345": "2024-09-14T18:00:00Z",
    "song67890": "2024-09-14T17:45:00Z"
  },
  "minutes_listened": {
    "song12345": 35,
    "song67890": 15
  },
  "playlist_snapshots": {
    "PL123456": {
      "reordered_songs": ["song67890", "song12345"],
      "last_modified": "2024-09-14T18:05:00Z"
    }
  }
}
```

---

## 12. API Endpoint Specifications

### 12.1 User Metadata Sync

- `GET /api/user/:user_id/data`  
  **Description:** Fetch user metadata, including play counts, last played timestamps, and playlist snapshots  
  **Response:** JSON in format of 11.3  

- `POST /api/user/:user_id/data`  
  **Description:** Update user metadata (play counts, playlist snapshots)  
  **Request Body:** JSON matching 11.3  
  **Response:** Status 200 OK  

---

### 12.2 Playlists

- `GET /api/playlists`  
  **Description:** Retrieve all playlists  
  **Response:** Array of playlist JSON objects (see 11.2)  

- `POST /api/playlists`  
  **Description:** Create a new playlist  
  **Request Body:** Playlist JSON (without `playlist_id`)  
  **Response:** Created playlist JSON with assigned `playlist_id`  

- `PUT /api/playlists/:playlist_id`  
  **Description:** Update playlist (e.g., reorder songs)  
  **Request Body:** Updated playlist JSON  
  **Response:** Updated playlist JSON  

---

### 12.3 Songs

- `GET /api/songs/:internal_id`  
  **Description:** Fetch song metadata including lyrics and features  
  **Response:** Song metadata JSON (11.1)  

- `POST /api/songs`  
  **Description:** Add new song metadata (backend/admin only)  
  **Request Body:** Song metadata JSON  
  **Response:** Status 201 Created  

---

### 12.4 Lyrics and Features

- `GET /api/songs/:internal_id/lyrics`  
  **Description:** Get aligned lyrics for a song  
  **Response:** Array of timestamped lyric lines  

- `GET /api/songs/:internal_id/features`  
  **Description:** Get audio and lyric feature data (tempo, key, mood embeddings, etc.)  
  **Response:** JSON with features  

---

### 12.5 Playlist Generation

- `POST /api/playlist/generate`  
  **Description:** Generate a playlist based on user parameters  
  **Request Body Example:**

```
{
  "moods": [
    { "name": "chill", "weight": 0.6 },
    { "name": "energetic", "weight": 0.4 }
  ],
  "artists": ["Artist A", "Artist B"],
  "duration_minutes": 30,
  "transition_duration_minutes": 10,
  "include_popular": true,
  "seed_songs": ["song12345"]
}
```

- **Response:** Playlist JSON with generated ordered song list  

---

## 13. Notes on Data Querying and Sync

- SQLite queries use standard SQL with indexing on `internal_id`, `playlist_id`, and `user_id` for fast lookup.  
- Playlist reorder snapshots stored as JSON blobs for flexibility.  
- Sync merges done via timestamps and last-write-wins on conflicts.  
- Frontend periodically polls or websockets for sync; backend supports idempotent updates.  

---

## 14. Extended Design Notes

---

### 14.1 Playlist Generation Algorithm

**Goal:** Create non-deterministic playlists that transition smoothly between moods or artists over a specified time window.

**Inputs:**
- Moods with weighted importance (e.g., chill 60%, energetic 40%)
- Target artists or songs to transition to
- Total playlist duration & transition time
- User preferences (e.g., include popular songs)

**Key Ideas:**
- Represent songs in a latent embedding space combining audio features (tempo, key, genre embeddings) and lyric-based semantic embeddings.
- Use continuous latent space for smooth interpolation instead of discrete clustering.
- Perform a **random walk with bias** in latent space:
  - Start in the region matching the first mood or artist.
  - At each step, probabilistically pick next song near current embedding with preference for target moods/artists.
  - During transitions, smoothly blend target distributions over the specified duration.
  - After transition, continue sampling from the next mood/artist distribution.
- Playlist length respects user-specified time window with flexibility (+/-).

**Implementation:**
- Precompute song embeddings offline (backend).
- At generation request, frontend sends user parameters to backend.
- Backend runs generation asynchronously, returns playlist JSON.
- Frontend caches playlist and plays.

**Handling manual inserts/reorders:**
- User can insert specific songs.
- Regenerate the rest of the playlist using the algorithm but preserving inserted songs.
- The random walk adapts to these fixed points.

---

### 14.2 Latent Space Construction

**Features to include:**
- Audio features: tempo, key, genre embedding, energy, danceability
- Lyrics semantic embedding: e.g., Sentence-BERT or similar embedding models applied to whole lyrics or segments
- Mood embeddings: learned from user-labeled or heuristically inferred moods

**Process:**
- Normalize continuous features to same scale.
- Concatenate audio and lyric embeddings.
- Use dimensionality reduction (e.g., PCA or UMAP) to reduce dimensions if necessary.
- Store embeddings in database or file system linked to song ID.

---

### 14.3 Lyrics Fetching and Alignment

**Lyrics Sources:**
- Use public lyrics websites with permissive policies (e.g., Genius API for free tier, lyrics.wikia, fallback to web scraping where TOS allow)
- Prioritize sources based on risk and coverage

**Fetching Flow:**
- On song addition or first request, backend attempts to fetch lyrics from primary source.
- If unavailable or user flags bad lyrics, try secondary sources.
- Cache all fetched lyrics in database.

**Alignment:**
- No official timestamp data for most songs.
- Use forced alignment algorithms (e.g., Gentle forced aligner, Montreal Forced Aligner) offline on backend.
- Align lyrics text with the audio waveform to generate approximate timestamps.
- Store aligned lyrics as JSON arrays of timestamp/line pairs.

---

### 14.4 Machine Learning Components

**Audio Feature Extraction:**
- Use libraries like Essentia or Librosa to extract:
  - Tempo (BPM), key, spectral features
  - Energy, danceability heuristics
- Offline batch processing on backend.

**Lyrics Embedding:**
- Use pre-trained models such as Sentence-BERT or similar for semantic embeddings.
- Vectorize lyrics or lyric segments.

**Mood Classification/Embedding:**
- Use unsupervised clustering combined with heuristics or crowdsourced labels to build mood spaces.
- Update with user feedback over time.

**Playlist Generation Model:**
- Implement random walk or probabilistic sampling in latent space with constraints.
- Support interpolation between user-selected moods/artists.

---

### 14.5 Sync and Offline Support

**Sync Strategy:**
- Stateless backend with user metadata stored persistently.
- Frontend caches play counts, last played, playlist snapshots locally (IndexedDB or app storage).
- On network availability:
  - Upload local changes (play counts, reorders).
  - Download latest server data.
  - Resolve conflicts with last-write-wins or timestamp-based merges.

**Offline Playback:**
- Cached songs and metadata stored on device.
- Flutter app plays audio in background with screen off.
- Sync deferred until connectivity.

---

### 14.6 Folder Selection and Storage on Desktop

- Allow user to pick custom folder for song storage.
- Map songs to files by internal ID to avoid collisions.
- Metadata stored in DB maps internal ID to file path.
- Sync metadata independent from media files.

---

## 15. Libraries and Resources

| Task                      | Library / Tool                  | Notes                                           |
|---------------------------|--------------------------------|------------------------------------------------|
| Backend Framework          | NodeJS + Express               | Existing familiarity, lightweight               |
| Database                  | SQLite                        | Low footprint, file-based, supports queries     |
| Audio Feature Extraction   | Essentia (C++/Python bindings) or Librosa (Python) | Run offline, batch processing                   |
| Lyrics Fetching            | Custom scrapers, Genius API   | Respect TOS, fallback to scraping if allowed    |
| Lyrics Alignment           | Gentle Forced Aligner, Montreal Forced Aligner | Open-source, offline alignment                   |
| Lyrics Embedding           | Sentence-BERT or similar       | Generate semantic embeddings                     |
| Latent Space Processing    | PCA, UMAP, t-SNE (Python/JS)  | Dimensionality reduction for embeddings          |
| Flutter Frontend           | Flutter framework              | Cross-platform UI, background audio support     |
| Syncing                   | REST API + IndexedDB/local storage | Conflict resolution via timestamps              |

---

## 16. Implementation Guidelines

- **Backend:**
  - Modularize: Separate concerns for audio processing, lyrics management, playlist generation.
  - Use async queues for expensive tasks (feature extraction, alignment).
  - Maintain a robust API with validation and versioning.
  - Store precomputed data for fast frontend queries.

- **Frontend:**
  - Use Flutter for cross-platform UI (desktop + mobile).
  - Cache user data and playlist snapshots locally.
  - Implement background audio playback with platform-specific plugins.
  - Provide UI for playlist generation parameters and manual song insertion.

- **Sync:**
  - Make all sync requests idempotent.
  - Provide UI feedback on sync status.
  - Allow manual sync trigger if needed.

- **Testing:**
  - Unit test playlist generation logic extensively.
  - Use sample datasets for audio features and lyrics.
  - Validate sync correctness on multi-device setups.

---

## 17. API Specification

---

### 17.1 Authentication

- **Type:** Token-based (JWT or similar)
- **Purpose:** Identify user for personalized data, sync, and playlist management.
- **Endpoints:**

| Endpoint           | Method | Description                  | Request Body              | Response                   |
|--------------------|--------|------------------------------|---------------------------|----------------------------|
| /api/auth/login    | POST   | Login user, receive token    | { username, password }    | { token, userId }           |
| /api/auth/register | POST   | Register new user            | { username, password }    | { token, userId }           |
| /api/auth/refresh  | POST   | Refresh JWT token            | { refreshToken }          | { token }                  |

---

### 17.2 Playlist Management

| Endpoint                   | Method | Description                                      | Request Body                                   | Response                              |
|----------------------------|--------|------------------------------------------------|-----------------------------------------------|-------------------------------------|
| /api/playlists             | GET    | Get all playlists for user                       | (auth token)                                  | [{ playlistId, playlistName, ... }] |
| /api/playlists             | POST   | Create a new playlist                            | { playlistName, songs: [songIds] }            | { playlistId, playlistName }        |
| /api/playlists/:id         | GET    | Get playlist by ID                              | (auth token)                                  | { playlistId, playlistName, songs } |
| /api/playlists/:id         | PUT    | Update playlist (songs order, name)             | { playlistName?, songs? }                      | { playlistId, playlistName, songs } |
| /api/playlists/:id         | DELETE | Delete playlist                                 | (auth token)                                  | { success: true }                   |

---

### 17.3 Song Metadata & Data

| Endpoint                   | Method | Description                                      | Request Body                                   | Response                              |
|----------------------------|--------|------------------------------------------------|-----------------------------------------------|-------------------------------------|
| /api/songs/:id             | GET    | Get song metadata and embeddings                 | (auth token)                                  | { songId, artist, title, embeddings, lyrics, timestamps } |
| /api/songs/:id/lyrics      | GET    | Get song lyrics                                  | (auth token)                                  | { lyrics, timestamps }              |
| /api/songs/:id/lyrics      | POST   | Submit corrected lyrics/timestamps               | { lyrics, timestamps }                         | { success: true }                   |

---

### 17.4 User Data Sync

| Endpoint                   | Method | Description                                      | Request Body                                   | Response                              |
|----------------------------|--------|------------------------------------------------|-----------------------------------------------|-------------------------------------|
| /api/userdata/playcounts   | GET    | Get user's cached play counts                    | (auth token)                                  | { songId: playCount, ... }           |
| /api/userdata/playcounts   | POST   | Upload updated play counts                        | { songId: playCount, ... }                     | { success: true }                   |
| /api/userdata/playliststate| GET    | Get user's current playlist state (order, position) | (auth token)                                  | { playlistId, order, currentSongIndex } |
| /api/userdata/playliststate| POST   | Update playlist state                             | { playlistId, order, currentSongIndex }       | { success: true }                   |

---

### 17.5 Playlist Generation

| Endpoint                   | Method | Description                                      | Request Body                                   | Response                              |
|----------------------------|--------|------------------------------------------------|-----------------------------------------------|-------------------------------------|
| /api/generate_playlist     | POST   | Generate a playlist based on moods, artists, preferences, and duration | { moods: [{name, weight}], targetArtists: [], durationMinutes, popularityBias, manualInserts: [] } | { playlist: [songIds], metadata } |

---

## 18. Database Schema

---

### 18.1 Tables

- **users**
  - user_id (PK, UUID)
  - username (unique)
  - password_hash
  - created_at
  - updated_at

- **songs**
  - song_id (PK, UUID or string)
  - title
  - artist
  - source (YouTube, Spotify, etc)
  - source_id (original ID from platform)
  - embedding (JSON or BLOB)
  - lyrics (TEXT)
  - lyrics_timestamps (JSON)
  - metadata (JSON: tempo, key, genre, etc.)
  - created_at
  - updated_at

- **playlists**
  - playlist_id (PK, UUID)
  - user_id (FK to users)
  - name
  - created_at
  - updated_at

- **playlist_songs**
  - playlist_id (FK to playlists)
  - song_id (FK to songs)
  - position (int)
  - PRIMARY KEY (playlist_id, position)

- **user_playcounts**
  - user_id (FK to users)
  - song_id (FK to songs)
  - play_count (int)
  - last_played_at (timestamp)
  - PRIMARY KEY (user_id, song_id)

- **user_playlist_states**
  - user_id (FK to users)
  - playlist_id (FK to playlists)
  - current_song_index (int)
  - order_json (JSON: stores reordered list of song IDs)
  - updated_at

---

## 19. Query Format Examples

- Get user playlists:

  ```sql
  SELECT playlist_id, name FROM playlists WHERE user_id = ?;

- Get songs in playlist ordered:

  ```sql
  SELECT s.* FROM songs s
  JOIN playlist_songs ps ON s.song_id = ps.song_id
  WHERE ps.playlist_id = ?
  ORDER BY ps.position;

- Update play count:

  ```sql
  INSERT INTO user_playcounts (user_id, song_id, play_count, last_played_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id, song_id) DO UPDATE SET
    play_count = play_count + excluded.play_count,
    last_played_at = excluded.last_played_at;

---

## 20. Security Considerations

- Use HTTPS for all API communications.
- Store passwords hashed with a strong algorithm (bcrypt or Argon2).
- Validate all inputs on backend.
- Implement rate limiting to prevent abuse.
- Sanitize data to avoid injection attacks.
- Authenticate all API endpoints with JWT tokens.
- Regularly update dependencies to patch vulnerabilities.

---

## 21. Deployment and Maintenance

- Deploy backend on a VPS or cloud instance with NodeJS runtime.
- Use PM2 or similar process manager to keep NodeJS app alive.
- Schedule batch jobs for audio feature extraction and lyrics alignment.
- Backup SQLite DB file regularly.
- Monitor logs and performance.
- Allow easy upgrade path for database migrations.
- Consider containerization (Docker) for environment consistency.

---

## 22. Summary

This specification outlines a full-stack music player app with:

- Cross-platform Flutter frontend supporting offline playback and background audio.
- NodeJS backend handling user data, playlist generation, lyrics fetching, and ML.
- SQLite database for low-footprint persistent storage.
- Use of advanced ML techniques for audio and lyric embedding.
- Non-deterministic playlist generation algorithm with flexible time management.
- Robust syncing and user data persistence across devices.
- API-driven architecture with clear schema and endpoints.
- Practical security and deployment guidance.
