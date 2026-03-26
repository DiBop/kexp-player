<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Station } from '../lib/stations';
  import { STATIONS } from '../lib/stations';

  export let selected: Station;

  const dispatch = createEventDispatcher<{ change: Station }>();

  function onChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    const station = STATIONS.find((s) => s.id === id)!;
    dispatch('change', station);
  }
</script>

<div class="station-selector">
  <select value={selected.id} on:change={onChange} aria-label="Select station">
    {#each STATIONS as station}
      <option value={station.id}>{station.name}</option>
    {/each}
  </select>
  <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
</div>

<style>
  .station-selector {
    position: relative;
    padding: 10px 16px 6px;
  }

  select {
    width: 100%;
    appearance: none;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 32px 8px 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s ease;
  }

  select:hover {
    border-color: var(--text-muted);
  }

  select:focus {
    border-color: var(--accent);
  }

  .chevron {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-2px);
    color: var(--text-muted);
    pointer-events: none;
  }
</style>
