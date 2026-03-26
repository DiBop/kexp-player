<script lang="ts">
  import { open } from '@tauri-apps/plugin-shell';
  import type { Play } from '../lib/kexp';

  export let plays: Play[] = [];

  function formatTime(airdate: string): string {
    const date = new Date(airdate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function searchTrack(play: Play) {
    const query = encodeURIComponent(`${play.artist} ${play.song}`);
    open(`https://duckduckgo.com/?q=${query}`).catch(console.error);
  }
</script>

<div class="feed-section">
  <div class="feed-header">RECENTLY PLAYED</div>
  <div class="feed">
    {#each plays as play, i (play.airdate)}
      <button
        class="track-row"
        class:current={i === 0}
        on:click={() => searchTrack(play)}
        title="Search on DuckDuckGo"
      >
        <div class="thumb-wrap">
          {#if play.thumbnail_uri}
            <img src={play.thumbnail_uri} alt="" class="thumb" />
          {:else}
            <div class="thumb-placeholder"></div>
          {/if}
        </div>
        <div class="track-info">
          <div class="track-song">{play.song}</div>
          <div class="track-artist">{play.artist}</div>
        </div>
        <div class="track-time">{formatTime(play.airdate)}</div>
      </button>
    {/each}

    {#if plays.length === 0}
      <div class="empty">Loading feed...</div>
    {/if}
  </div>
</div>

<style>
  .feed-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .feed-header {
    padding: 8px 16px 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .feed {
    overflow-y: auto;
    flex: 1;
    padding: 4px 8px 8px;
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .track-row:hover {
    background: var(--bg-card-hover);
    transform: scale(1.02);
    box-shadow: 0 4px 12px var(--shadow);
  }

  .track-row.current {
    background: var(--accent-dim);
    border: 1px solid rgba(233, 30, 99, 0.25);
  }

  .track-row.current:hover {
    background: rgba(233, 30, 99, 0.22);
  }

  .thumb-wrap {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-card);
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    background: var(--bg-secondary);
  }

  .track-info {
    flex: 1;
    min-width: 0;
  }

  .track-song {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-artist {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }

  .track-time {
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .empty {
    padding: 24px 8px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }
</style>
