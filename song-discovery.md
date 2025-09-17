# Autonomous Niche & New Music Discovery Pipeline Specification

---

## Objective

Build a fully autonomous, self-hosted music discovery and recommendation pipeline that:

- Uses your **local library** as a seed point.  
- Finds **new niche or unknown artists/songs** related to your tastes.  
- Avoids popularity bias inherent in large public datasets or YouTube search.  
- Operates without cloud services or commercial APIs beyond YouTube Data API.  
- Integrates into your existing latent space embedding & autoencoder system.  
- Downloads promising songs temporarily for exploration and permanent addition if played.

---

## Components

### 1. Local Library & Latent Space

- **Static Folder:** Persistent library of fully downloaded songs.  
- **Latent Space Embeddings:**  
  - Each song embedded via your autoencoder from audio features.  
  - Store embeddings in a vector DB or SQLite for fast similarity queries.  
- **Seed Artists:** Identify your top niche artists from your library (e.g., mccafferty, mothica).

---

### 2. External Data Sources for Candidate Discovery

- **YouTube:** Primary discovery platform for new releases.  
- **Bandcamp, Reddit, Instagram:** Secondary scrapes for niche artist and song metadata.  
  - Scrape artist names, track titles, descriptions, hashtags.  
  - Parse captions or posts for song title + artist pairs.

---

### 3. Metadata Embedding Model

- Use a **contrastive learning model** or a neural network trained to embed text metadata (titles, descriptions, tags) into the **same latent space** as your audio embeddings.  
- This enables direct similarity comparison between your local songs and scraped metadata **without needing to download audio first**.

---

### 4. Query Generation

- For each seed artist or song in your local library, generate multiple YouTube search queries by combining:

  - **“fans of [artist/song]”** phrases.  
  - Descriptive mood/style keywords related to your music taste, e.g., melancholic, lo-fi, DIY, raw, ethereal, bedroom pop.  
  - Variations like “similar to [artist]”, “unsigned”, “underground”, “indie”.

- Example queries:

  - `fans of mccafferty melancholic indie`  
  - `for fans of mothica lo-fi bedroom pop`  
  - `similar to [seed artist] raw acoustic unsigned`

---

### 5. YouTube Search & Filtering

- Use **YouTube Data API v3** to perform searches with the generated queries.  
- Use these parameters to bias results toward niche:

  - `order=date` — to get recent uploads.  
  - `publishedAfter` — filter for recent uploads (e.g., last 30 days).  
  - (Optional) `videoDuration` — e.g., 2 to 7 minutes, to approximate song length.

- Retrieve a batch of video IDs.  
- For each video ID, call `videos.list` with `part=statistics` to get view counts.  
- **Filter videos client-side** by view count threshold (e.g., < 10,000 views) to reduce popularity bias.

---

### 6. Metadata Embedding & Similarity Filtering

- For each candidate video:

  - Extract metadata: title, description, tags.  
  - Embed metadata with your metadata embedding model.  
  - Compute similarity between candidate embedding and your seed artist/song embeddings or your local library’s latent space clusters.  
- Filter candidates by similarity threshold (adjustable to balance strictness vs exploration).

---

### 7. Temporary Download & Embedding of Audio

- For candidates passing similarity + view count thresholds:

  - Download audio using **yt-dlp** into a **temporary folder**.  
  - Extract audio features and embed with your audio autoencoder.  
  - Confirm audio embedding similarity aligns with metadata similarity.  
- Add these temporary songs and their embeddings into your vector DB, marked as **“temp”**.

---

### 8. Listen Tracking & Promotion to Library

- Track user plays on temporary songs via your app.  
- If a song is played at least once, **promote it**:

  - Move audio file from temp folder to static library.  
  - Mark its embedding as permanent.  
- If not played within a defined window (e.g., 60 days), delete temp files and remove embeddings.

---

### 9. Secondary Niche Artist Discovery (Optional)

- Scrape Bandcamp, Reddit niche music communities, Instagram hashtags.  
- Extract artist & song metadata.  
- Embed metadata and identify candidates close to your latent space but distant from popular clusters.  
- Search YouTube for these artists/tracks using enriched queries, then proceed with the same filtering, embedding, and temp download pipeline.

---

### 10. Scheduled Automation

- Automate the following on a daily or configurable schedule:

  - Refresh seed artist list from your library.  
  - Generate new YouTube queries.  
  - Run YouTube search + view filtering.  
  - Embed candidate metadata & filter by similarity.  
  - Download promising candidates to temp folder.  
  - Delete stale temp songs older than 60 days and not played.  
  - Sync latent space embeddings with physical files.

---

## Data Storage & Infrastructure

- **Metadata DB (SQLite or similar):**

  - Track video IDs, artist/song metadata, embedding vectors, download timestamps, listen counts, temp vs permanent status.

- **Vector DB:**

  - Store and query audio & metadata embeddings.

- **File Storage:**

  - Separate folders for permanent library and temp downloads.

- **Logging & Monitoring:**

  - Track success/failure rates of downloads, embedding mismatches, user listens.

---

## Security & Performance

- Respect YouTube API quotas by batching calls.  
- Rate-limit scraping and downloads to avoid bans.  
- Verify audio file integrity before embedding and promotion.  
- Implement error handling and retry logic.

---

## Summary Pipeline Flow

```mermaid
flowchart TD
  A(Seed Artist List from Local Library) --> B(Generate YouTube Queries (fans of + keywords))
  B --> C(YouTube Search (date + duration filters))
  C --> D(Fetch View Counts)
  D --> E{View Count < Threshold?}
  E -- No --> F(Discard Video)
  E -- Yes --> G(Embed Metadata)
  G --> H{Similarity > Threshold?}
  H -- No --> F
  H -- Yes --> I(Download Audio (yt-dlp) to Temp Folder)
  I --> J(Extract Audio Features & Embed)
  J --> K(Add to Vector DB (Temp))
  K --> L(User Listen Tracking)
  L --> M{Played?}
  M -- Yes --> N(Move to Permanent Library & Mark Embedding Permanent)
  M -- No --> O(Keep in Temp Folder Until 60 Days)
  O --> P(Cleanup & Delete Old Unplayed Songs)
```

---

## Next Steps: Implementation Suggestions

- Build **query generator** to create “fans of + keywords” queries.  
- Develop metadata embedding model to embed YouTube metadata.  
- Implement YouTube search + filtering + view count checking module.  
- Integrate **yt-dlp** to download filtered candidates to temp folder.  
- Create a metadata & embedding DB to track candidates and statuses.  
- Add user listen tracking hooks to promote temp songs to permanent library.  
- Automate daily jobs for continuous discovery and cleanup.
