<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { AudioManager } from '$lib/audio/AudioManager';
  import type { AudioTrack } from '$lib/audio/types';

  // Props
  let {
    audioManager,
    tracks = [],
    showMusicControls = true,
    showSfxControls = true,
    expandable = true,
  }: {
    audioManager: AudioManager;
    tracks?: AudioTrack[];
    showMusicControls?: boolean;
    showSfxControls?: boolean;
    expandable?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let isExpanded = $state(true);
  let currentTrackIndex = $state(0);
  let isMusicPlaying = $state(false);
  let masterVolume = $state(1.0);
  let musicVolume = $state(1.0);
  let sfxVolume = $state(1.0);

  // Get current track
  const currentTrack = $derived(tracks[currentTrackIndex] || null);

  function toggleExpand() {
    if (expandable) {
      isExpanded = !isExpanded;
    }
  }

  async function playTrack(index: number) {
    if (!tracks[index]) return;

    currentTrackIndex = index;
    await audioManager.playMusic(tracks[index]);
    isMusicPlaying = true;
    dispatch('trackChanged', { track: tracks[index], index });
  }

  async function togglePlayPause() {
    if (isMusicPlaying) {
      audioManager.stopMusic();
      isMusicPlaying = false;
      dispatch('paused');
    } else if (currentTrack) {
      await audioManager.playMusic(currentTrack);
      isMusicPlaying = true;
      dispatch('played', { track: currentTrack });
    }
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  }

  function previousTrack() {
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    playTrack(prevIndex);
  }

  function handleMasterVolumeChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    masterVolume = value;
    audioManager.setMasterVolume(value);
    dispatch('volumeChanged', { type: 'master', value });
  }

  function handleMusicVolumeChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    musicVolume = value;
    audioManager.setMusicVolume(value);
    dispatch('volumeChanged', { type: 'music', value });
  }

  function handleSfxVolumeChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    sfxVolume = value;
    audioManager.setSFXVolume(value);
    dispatch('volumeChanged', { type: 'sfx', value });
  }

  function stopAll() {
    audioManager.stopMusic();
    audioManager.stopAllSoundEffects();
    isMusicPlaying = false;
    dispatch('stopped');
  }

  function formatVolume(volume: number): string {
    return `${Math.round(volume * 100)}%`;
  }
</script>

<div class="audio-controls" class:collapsed={!isExpanded}>
  <div class="controls-header" onclick={toggleExpand}>
    <div class="header-content">
      <span class="header-icon">🎵</span>
      <h3>Audio Controls</h3>
      {#if !isExpanded && currentTrack}
        <span class="header-info">{currentTrack.name}</span>
      {/if}
    </div>
    {#if expandable}
      <button class="expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
        {isExpanded ? '▼' : '▶'}
      </button>
    {/if}
  </div>

  {#if isExpanded}
    <div class="controls-content">
      <!-- Master Volume -->
      <div class="volume-section">
        <div class="volume-header">
          <label for="master-volume">Master Volume</label>
          <span class="volume-value">{formatVolume(masterVolume)}</span>
        </div>
        <div class="slider-container">
          <span class="slider-icon">🔇</span>
          <input
            type="range"
            id="master-volume"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            oninput={handleMasterVolumeChange}
            class="volume-slider"
          />
          <span class="slider-icon">🔊</span>
        </div>
      </div>

      {#if showMusicControls}
        <div class="section-divider"></div>

        <!-- Music Controls -->
        <div class="music-section">
          <h4>Music</h4>

          {#if currentTrack}
            <div class="now-playing">
              <div class="track-info">
                <div class="track-name">{currentTrack.name}</div>
                <div class="track-meta">
                  {currentTrack.loop ? '🔁 Loop' : '▶️ Play Once'}
                </div>
              </div>
            </div>

            <div class="playback-controls">
              <button
                class="control-btn"
                onclick={previousTrack}
                disabled={tracks.length <= 1}
                aria-label="Previous track"
              >
                ⏮
              </button>
              <button
                class="control-btn primary"
                onclick={togglePlayPause}
                aria-label={isMusicPlaying ? 'Pause' : 'Play'}
              >
                {isMusicPlaying ? '⏸' : '▶️'}
              </button>
              <button
                class="control-btn"
                onclick={nextTrack}
                disabled={tracks.length <= 1}
                aria-label="Next track"
              >
                ⏭
              </button>
              <button class="control-btn danger" onclick={stopAll} aria-label="Stop all">
                ⏹
              </button>
            </div>
          {:else}
            <div class="empty-state">
              <p>No music tracks available</p>
            </div>
          {/if}

          <div class="volume-header">
            <label for="music-volume">Music Volume</label>
            <span class="volume-value">{formatVolume(musicVolume)}</span>
          </div>
          <div class="slider-container">
            <span class="slider-icon">🔇</span>
            <input
              type="range"
              id="music-volume"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              oninput={handleMusicVolumeChange}
              class="volume-slider"
            />
            <span class="slider-icon">🔊</span>
          </div>

          {#if tracks.length > 1}
            <div class="track-list">
              <h5>Available Tracks</h5>
              {#each tracks as track, index}
                <button
                  class="track-item"
                  class:active={index === currentTrackIndex}
                  onclick={() => playTrack(index)}
                >
                  <span class="track-number">{index + 1}</span>
                  <span class="track-name">{track.name}</span>
                  {#if index === currentTrackIndex && isMusicPlaying}
                    <span class="playing-indicator">▶️</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if showSfxControls}
        <div class="section-divider"></div>

        <!-- Sound Effects Controls -->
        <div class="sfx-section">
          <h4>Sound Effects</h4>
          <div class="volume-header">
            <label for="sfx-volume">SFX Volume</label>
            <span class="volume-value">{formatVolume(sfxVolume)}</span>
          </div>
          <div class="slider-container">
            <span class="slider-icon">🔇</span>
            <input
              type="range"
              id="sfx-volume"
              min="0"
              max="1"
              step="0.01"
              value={sfxVolume}
              oninput={handleSfxVolumeChange}
              class="volume-slider"
            />
            <span class="slider-icon">🔊</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .audio-controls {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  .audio-controls.collapsed {
    border-radius: 8px;
  }

  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    cursor: pointer;
    transition: background 0.2s;
  }

  .controls-header:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .header-icon {
    font-size: 24px;
  }

  .controls-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .header-info {
    font-size: 14px;
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  .expand-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 4px 8px;
  }

  .controls-content {
    padding: 20px;
  }

  .section-divider {
    height: 1px;
    background: var(--border-color, #e0e0e0);
    margin: 20px 0;
  }

  .volume-section,
  .music-section,
  .sfx-section {
    margin-bottom: 0;
  }

  .volume-section h4,
  .music-section h4,
  .sfx-section h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .volume-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .volume-header label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .volume-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-color, #3498db);
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .slider-icon {
    font-size: 18px;
  }

  .volume-slider {
    flex: 1;
    height: 6px;
    appearance: none;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 3px;
    outline: none;
  }

  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .volume-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .volume-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  .now-playing {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    color: white;
  }

  .track-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .track-name {
    font-size: 16px;
    font-weight: 600;
  }

  .track-meta {
    font-size: 13px;
    opacity: 0.9;
  }

  .playback-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .control-btn {
    flex: 1;
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
    transform: translateY(-2px);
  }

  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .control-btn.primary {
    background: var(--accent-color, #3498db);
    color: white;
    border-color: var(--accent-color, #3498db);
  }

  .control-btn.primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  .control-btn.danger {
    background: #f44336;
    color: white;
    border-color: #f44336;
  }

  .control-btn.danger:hover:not(:disabled) {
    background: #d32f2f;
  }

  .empty-state {
    text-align: center;
    padding: 20px;
    color: var(--text-secondary, #666);
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }

  .track-list {
    margin-top: 16px;
  }

  .track-list h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
    font-weight: 500;
  }

  .track-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 6px;
    text-align: left;
  }

  .track-item:hover {
    background: var(--bg-hover, #e0e0e0);
    transform: translateX(4px);
  }

  .track-item.active {
    background: rgba(52, 152, 219, 0.1);
    border-color: var(--accent-color, #3498db);
  }

  .track-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--bg-primary, white);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #666);
  }

  .track-item.active .track-number {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .track-item .track-name {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary, #333);
  }

  .playing-indicator {
    font-size: 16px;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @media (max-width: 768px) {
    .controls-header h3 {
      font-size: 16px;
    }

    .header-info {
      display: none;
    }

    .playback-controls {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
