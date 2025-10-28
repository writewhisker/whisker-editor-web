<script lang="ts">
  /**
   * AssetManager - Manage story assets (images, audio, video)
   */
  import { currentStory } from '../../stores/projectStore';
  import type { AssetReference } from '../../models/types';
  import { nanoid } from 'nanoid';

  let selectedAsset: AssetReference | null = null;
  let filterType: 'all' | 'image' | 'audio' | 'video' | 'font' | 'other' = 'all';
  let searchQuery = '';
  let showUploadDialog = false;

  $: assets = $currentStory ? Array.from($currentStory.assets.values()) : [];
  $: filteredAssets = assets.filter(asset => {
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesSearch = !searchQuery ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  function detectAssetType(mimeType: string): AssetReference['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('font/')) return 'font';
    return 'other';
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !$currentStory) return;

    for (const file of Array.from(input.files)) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const asset: AssetReference = {
          id: nanoid(),
          name: file.name,
          type: detectAssetType(file.type),
          path: dataUrl, // Store as data URL for now
          mimeType: file.type,
          size: file.size,
          metadata: {}
        };

        if ($currentStory) {
          $currentStory.assets.set(asset.id, asset);
          currentStory.set($currentStory);
        }
      };

      reader.readAsDataURL(file);
    }

    input.value = ''; // Reset input
  }

  function deleteAsset(assetId: string) {
    if (!$currentStory) return;

    if (confirm('Delete this asset? This cannot be undone.')) {
      $currentStory.assets.delete(assetId);
      currentStory.set($currentStory);
      if (selectedAsset?.id === assetId) {
        selectedAsset = null;
      }
    }
  }

  function copyAssetUrl(assetId: string) {
    const url = `asset://${assetId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Asset URL copied to clipboard!');
    });
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getAssetPreview(asset: AssetReference): string {
    switch (asset.type) {
      case 'image':
        return asset.path;
      case 'audio':
        return '🔊';
      case 'video':
        return '🎬';
      case 'font':
        return '🔤';
      default:
        return '📄';
    }
  }
</script>

<div class="asset-manager">
  <div class="toolbar">
    <div class="search-filter">
      <input
        type="text"
        class="search-input"
        placeholder="Search assets..."
        bind:value={searchQuery}
      />

      <select class="filter-select" bind:value={filterType}>
        <option value="all">All Types</option>
        <option value="image">Images</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
        <option value="font">Fonts</option>
        <option value="other">Other</option>
      </select>
    </div>

    <label class="btn-upload">
      + Upload
      <input
        type="file"
        multiple
        accept="image/*,audio/*,video/*,font/*"
        on:change={handleFileUpload}
        style="display: none;"
      />
    </label>
  </div>

  <div class="content">
    <div class="asset-list">
      {#if filteredAssets.length === 0}
        <div class="empty-state">
          <p>No assets found</p>
          {#if assets.length === 0}
            <label class="btn-primary">
              Upload First Asset
              <input
                type="file"
                multiple
                accept="image/*,audio/*,video/*,font/*"
                on:change={handleFileUpload}
                style="display: none;"
              />
            </label>
          {/if}
        </div>
      {:else}
        <div class="assets-grid">
          {#each filteredAssets as asset (asset.id)}
            <div
              class="asset-card"
              class:selected={selectedAsset?.id === asset.id}
              on:click={() => selectedAsset = asset}
            >
              <div class="asset-preview">
                {#if asset.type === 'image'}
                  <img src={asset.path} alt={asset.name} />
                {:else}
                  <div class="asset-icon">{getAssetPreview(asset)}</div>
                {/if}
              </div>

              <div class="asset-info">
                <div class="asset-name" title={asset.name}>{asset.name}</div>
                <div class="asset-meta">
                  <span class="asset-type">{asset.type}</span>
                  <span class="asset-size">{formatSize(asset.size)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if selectedAsset}
      <div class="asset-details">
        <h3>Asset Details</h3>

        <div class="detail-preview">
          {#if selectedAsset.type === 'image'}
            <img src={selectedAsset.path} alt={selectedAsset.name} />
          {:else if selectedAsset.type === 'audio'}
            <audio controls src={selectedAsset.path}>
              Your browser does not support audio.
            </audio>
          {:else if selectedAsset.type === 'video'}
            <video controls src={selectedAsset.path}>
              Your browser does not support video.
            </video>
          {:else}
            <div class="detail-icon">{getAssetPreview(selectedAsset)}</div>
          {/if}
        </div>

        <div class="detail-fields">
          <div class="field">
            <label>Name</label>
            <input type="text" value={selectedAsset.name} readonly />
          </div>

          <div class="field">
            <label>ID</label>
            <div class="field-with-action">
              <input type="text" value={selectedAsset.id} readonly />
              <button on:click={() => copyAssetUrl(selectedAsset!.id)} class="btn-copy">
                Copy URL
              </button>
            </div>
          </div>

          <div class="field">
            <label>Type</label>
            <input type="text" value={selectedAsset.type} readonly />
          </div>

          <div class="field">
            <label>MIME Type</label>
            <input type="text" value={selectedAsset.mimeType} readonly />
          </div>

          <div class="field">
            <label>Size</label>
            <input type="text" value={formatSize(selectedAsset.size)} readonly />
          </div>

          <div class="field">
            <label>Usage</label>
            <code class="usage-example">
              {#if selectedAsset.type === 'image'}
                ![{selectedAsset.name}](asset://{selectedAsset.id})
              {:else if selectedAsset.type === 'audio' || selectedAsset.type === 'video'}
                playMedia('asset://{selectedAsset.id}')
              {:else}
                asset://{selectedAsset.id}
              {/if}
            </code>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-delete" on:click={() => deleteAsset(selectedAsset!.id)}>
            Delete Asset
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .asset-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background);
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .search-filter {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }

  .search-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 0.875rem;
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-upload {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .btn-upload:hover {
    background: var(--color-primary-dark);
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1rem;
    flex: 1;
    overflow: hidden;
  }

  .asset-list {
    overflow-y: auto;
    padding: 1rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    text-align: center;
  }

  .empty-state p {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }

  .asset-card {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .asset-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }

  .asset-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .asset-preview {
    aspect-ratio: 1;
    background: var(--color-background);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .asset-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .asset-icon {
    font-size: 3rem;
  }

  .asset-info {
    padding: 0.5rem;
  }

  .asset-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .asset-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.625rem;
    color: var(--color-text-secondary);
  }

  .asset-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .asset-details h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text);
  }

  .detail-preview {
    width: 100%;
    aspect-ratio: 1;
    background: var(--color-background);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .detail-preview img,
  .detail-preview video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .detail-preview audio {
    width: 100%;
  }

  .detail-icon {
    font-size: 4rem;
  }

  .detail-fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .field input {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: monospace;
  }

  .field-with-action {
    display: flex;
    gap: 0.5rem;
  }

  .field-with-action input {
    flex: 1;
  }

  .btn-copy {
    padding: 0.5rem 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .btn-copy:hover {
    background: var(--color-primary-dark);
  }

  .usage-example {
    display: block;
    padding: 0.5rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--color-primary);
    word-break: break-all;
  }

  .detail-actions {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .btn-delete {
    flex: 1;
    padding: 0.5rem;
    background: var(--color-error);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-delete:hover {
    background: var(--color-error-dark);
  }
</style>
