<script lang="ts">
  /**
   * AssetManager - Manage story assets (images, audio, video)
   */
  import { currentStory } from '../../stores/projectStore';
  import type { AssetReference } from '../../models/types';
  import { nanoid } from 'nanoid';

  interface UploadQueueItem {
    id: string;
    file: File;
    name: string;
    type: AssetReference['type'];
    size: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    speed: number; // bytes per second
    error?: string;
    startTime?: number;
    bytesUploaded: number;
    cancelController?: AbortController;
  }

  let selectedAsset: AssetReference | null = null;
  let filterType: 'all' | 'image' | 'audio' | 'video' | 'font' | 'other' = 'all';
  let searchQuery = '';
  let showUploadDialog = false;
  let uploadQueue: UploadQueueItem[] = [];
  let isDragging = false;
  let notification: { type: 'success' | 'error'; message: string } | null = null;

  $: assets = $currentStory ? Array.from($currentStory.assets.values()) : [];
  $: filteredAssets = assets.filter(asset => {
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesSearch = !searchQuery ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  $: hasActiveUploads = uploadQueue.some(item =>
    item.status === 'uploading' || item.status === 'pending'
  );

  $: overallProgress = uploadQueue.length > 0
    ? uploadQueue.reduce((sum, item) => sum + item.progress, 0) / uploadQueue.length
    : 0;

  $: completedUploads = uploadQueue.filter(item => item.status === 'completed').length;
  $: totalUploads = uploadQueue.length;

  function detectAssetType(mimeType: string): AssetReference['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('font/')) return 'font';
    return 'other';
  }

  function showNotification(type: 'success' | 'error', message: string) {
    notification = { type, message };
    setTimeout(() => {
      notification = null;
    }, 5000);
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !$currentStory) return;

    await processFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }

  async function processFiles(files: File[]) {
    if (!$currentStory) return;

    // Add files to queue
    const newItems: UploadQueueItem[] = files.map(file => ({
      id: nanoid(),
      file,
      name: file.name,
      type: detectAssetType(file.type),
      size: file.size,
      status: 'pending' as const,
      progress: 0,
      speed: 0,
      bytesUploaded: 0,
      cancelController: new AbortController()
    }));

    uploadQueue = [...uploadQueue, ...newItems];

    // Process queue
    for (const item of newItems) {
      await uploadFile(item);
    }
  }

  async function uploadFile(item: UploadQueueItem) {
    if (!$currentStory) return;

    item.status = 'uploading';
    item.startTime = Date.now();
    uploadQueue = uploadQueue;

    try {
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            item.progress = (e.loaded / e.total) * 100;
            item.bytesUploaded = e.loaded;

            // Calculate upload speed
            const elapsed = (Date.now() - (item.startTime || Date.now())) / 1000;
            if (elapsed > 0) {
              item.speed = e.loaded / elapsed;
            }

            uploadQueue = uploadQueue;
          }
        };

        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const asset: AssetReference = {
            id: nanoid(),
            name: item.file.name,
            type: item.type,
            path: dataUrl,
            mimeType: item.file.type,
            size: item.file.size,
            metadata: {}
          };

          if ($currentStory) {
            $currentStory.assets.set(asset.id, asset);
            currentStory.set($currentStory);
          }

          item.status = 'completed';
          item.progress = 100;
          uploadQueue = uploadQueue;

          resolve();
        };

        // Check for cancellation
        if (item.cancelController?.signal.aborted) {
          reject(new Error('Upload cancelled'));
          return;
        }

        reader.readAsDataURL(item.file);
      });

      showNotification('success', `${item.name} uploaded successfully`);

      // Remove completed items after delay
      setTimeout(() => {
        uploadQueue = uploadQueue.filter(i => i.id !== item.id);
      }, 3000);

    } catch (error) {
      item.status = 'error';
      item.error = error instanceof Error ? error.message : 'Upload failed';
      uploadQueue = uploadQueue;
      showNotification('error', `Failed to upload ${item.name}`);
    }
  }

  function cancelUpload(itemId: string) {
    const item = uploadQueue.find(i => i.id === itemId);
    if (item && item.status === 'uploading') {
      item.cancelController?.abort();
      item.status = 'error';
      item.error = 'Upload cancelled';
      uploadQueue = uploadQueue;
    }
  }

  function retryUpload(itemId: string) {
    const item = uploadQueue.find(i => i.id === itemId);
    if (item && item.status === 'error') {
      item.status = 'pending';
      item.progress = 0;
      item.speed = 0;
      item.bytesUploaded = 0;
      item.error = undefined;
      item.cancelController = new AbortController();
      uploadQueue = uploadQueue;
      uploadFile(item);
    }
  }

  function removeFromQueue(itemId: string) {
    uploadQueue = uploadQueue.filter(i => i.id !== itemId);
  }

  function clearCompleted() {
    uploadQueue = uploadQueue.filter(item =>
      item.status !== 'completed' && item.status !== 'error'
    );
  }

  function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  // Drag and drop handlers
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    if (e.target === e.currentTarget) {
      isDragging = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    if (!e.dataTransfer?.files || !$currentStory) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
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

<div
  class="asset-manager"
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  role="region"
  aria-label="Asset Manager"
>
  <!-- Drag and drop overlay -->
  {#if isDragging}
    <div class="drag-overlay">
      <div class="drag-content">
        <div class="drag-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h3>Drop files to upload</h3>
        <p>Images, audio, video, and fonts supported</p>
      </div>
    </div>
  {/if}

  <!-- Notification Toast -->
  {#if notification}
    <div class="notification {notification.type}">
      <div class="notification-content">
        <span class="notification-icon">
          {#if notification.type === 'success'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          {/if}
        </span>
        <span class="notification-message">{notification.message}</span>
      </div>
    </div>
  {/if}

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
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectedAsset = asset;
                }
              }}
              role="button"
              tabindex="0"
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
        <h3>Preview</h3>

        <div class="detail-preview">
          {#if selectedAsset.type === 'image'}
            <img src={selectedAsset.path} alt={selectedAsset.name} />
          {:else if selectedAsset.type === 'audio'}
            <div class="audio-preview">
              <div class="audio-icon">🔊</div>
              <div class="audio-info">
                <div class="audio-name">{selectedAsset.name}</div>
                <div class="audio-meta">{selectedAsset.mimeType || 'Audio file'}</div>
              </div>
              <audio controls src={selectedAsset.path}>
                Your browser does not support audio.
              </audio>
            </div>
          {:else if selectedAsset.type === 'video'}
            <video controls src={selectedAsset.path}>
              Your browser does not support video.
            </video>
          {:else}
            <div class="file-preview">
              <div class="detail-icon">{getAssetPreview(selectedAsset)}</div>
              <div class="file-info">
                <div class="file-name">{selectedAsset.name}</div>
                <div class="file-meta">
                  {selectedAsset.mimeType || selectedAsset.type}
                  {#if selectedAsset.size}
                    • {formatSize(selectedAsset.size)}
                  {/if}
                </div>
              </div>
            </div>
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
    {:else if assets.length > 0}
      <div class="asset-details no-selection">
        <div class="no-selection-content">
          <div class="no-selection-icon">👁️</div>
          <h3>No Asset Selected</h3>
          <p>Click on an asset to preview it</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Upload Queue Panel -->
  {#if uploadQueue.length > 0}
    <div class="upload-queue">
      <div class="queue-header">
        <div class="queue-title">
          <h3>Upload Queue</h3>
          <span class="queue-count">{completedUploads}/{totalUploads}</span>
        </div>

        {#if !hasActiveUploads}
          <button class="btn-clear" on:click={clearCompleted}>
            Clear
          </button>
        {/if}
      </div>

      <!-- Overall progress bar -->
      {#if hasActiveUploads}
        <div class="overall-progress">
          <div class="overall-progress-bar">
            <div class="overall-progress-fill" style="width: {overallProgress}%"></div>
          </div>
          <span class="overall-progress-text">{overallProgress.toFixed(0)}%</span>
        </div>
      {/if}

      <div class="queue-list">
        {#each uploadQueue as item (item.id)}
          <div class="queue-item {item.status}">
            <div class="queue-item-icon">
              {#if item.status === 'completed'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              {:else if item.status === 'error'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="12" y1="8" x2="12" y2="8" />
                </svg>
              {:else if item.status === 'uploading'}
                <div class="spinner"></div>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              {/if}
            </div>

            <div class="queue-item-content">
              <div class="queue-item-header">
                <span class="queue-item-name" title={item.name}>{item.name}</span>
                <span class="queue-item-size">{formatSize(item.size)}</span>
              </div>

              {#if item.status === 'error'}
                <div class="queue-item-error">
                  {item.error || 'Upload failed'}
                </div>
              {:else if item.status === 'uploading'}
                <div class="queue-item-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: {item.progress}%"></div>
                  </div>
                  <div class="progress-info">
                    <span class="progress-percent">{item.progress.toFixed(0)}%</span>
                    <span class="progress-speed">{formatSpeed(item.speed)}</span>
                  </div>
                </div>
              {:else if item.status === 'completed'}
                <div class="queue-item-completed">
                  Upload complete
                </div>
              {:else}
                <div class="queue-item-pending">
                  Pending...
                </div>
              {/if}
            </div>

            <div class="queue-item-actions">
              {#if item.status === 'uploading'}
                <button
                  class="btn-cancel"
                  on:click={() => cancelUpload(item.id)}
                  title="Cancel upload"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              {:else if item.status === 'error'}
                <button
                  class="btn-retry"
                  on:click={() => retryUpload(item.id)}
                  title="Retry upload"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>
                <button
                  class="btn-remove"
                  on:click={() => removeFromQueue(item.id)}
                  title="Remove from queue"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
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
    position: relative;
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

  .asset-card:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .asset-card:focus:not(:focus-visible) {
    box-shadow: none;
  }

  .asset-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    background: var(--color-primary-light, rgba(59, 130, 246, 0.1));
  }

  .asset-card.selected::after {
    content: '✓';
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: bold;
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

  .asset-details.no-selection {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .no-selection-content {
    text-align: center;
    color: var(--color-text-secondary);
  }

  .no-selection-icon {
    font-size: 3rem;
    opacity: 0.5;
    margin-bottom: 1rem;
  }

  .no-selection-content h3 {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .no-selection-content p {
    font-size: 0.875rem;
    margin: 0;
  }

  .detail-preview {
    width: 100%;
    min-height: 200px;
    background: var(--color-background);
    border-radius: 8px;
    border: 2px solid var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 1rem;
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .detail-preview img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .detail-preview video {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
  }

  .detail-preview audio {
    width: 100%;
    margin-top: 1rem;
  }

  .detail-icon {
    font-size: 5rem;
    opacity: 0.5;
  }

  .audio-preview {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .audio-icon {
    font-size: 4rem;
    opacity: 0.7;
  }

  .audio-info {
    text-align: center;
    width: 100%;
  }

  .audio-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
    word-break: break-word;
  }

  .audio-meta {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .file-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .file-info {
    width: 100%;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
    word-break: break-word;
  }

  .file-meta {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
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

  /* Drag and drop overlay */
  .drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(59, 130, 246, 0.1);
    backdrop-filter: blur(4px);
    border: 3px dashed var(--color-primary);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-in-out;
  }

  .drag-content {
    text-align: center;
    color: var(--color-primary);
  }

  .drag-icon {
    margin-bottom: 1rem;
    animation: bounce 1s infinite;
  }

  .drag-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--color-primary);
  }

  .drag-content p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  /* Notification Toast */
  .notification {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 1rem;
    z-index: 1001;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  }

  .notification.success {
    border-left: 4px solid #10b981;
  }

  .notification.error {
    border-left: 4px solid var(--color-error);
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .notification-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification.success .notification-icon {
    color: #10b981;
  }

  .notification.error .notification-icon {
    color: var(--color-error);
  }

  .notification-message {
    flex: 1;
    font-size: 0.875rem;
    color: var(--color-text);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Upload Queue Panel */
  .upload-queue {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-surface);
    border-top: 2px solid var(--color-border);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background);
  }

  .queue-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .queue-title h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .queue-count {
    padding: 0.125rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .btn-clear {
    padding: 0.25rem 0.75rem;
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .btn-clear:hover {
    background: var(--color-background);
    color: var(--color-text);
  }

  .overall-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-background);
  }

  .overall-progress-bar {
    flex: 1;
    height: 8px;
    background: var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .overall-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), #60a5fa);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .overall-progress-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
    min-width: 3rem;
    text-align: right;
  }

  .queue-list {
    overflow-y: auto;
    max-height: 280px;
  }

  .queue-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.2s;
  }

  .queue-item:hover {
    background: var(--color-background);
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .queue-item-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.125rem;
  }

  .queue-item.completed .queue-item-icon {
    color: #10b981;
  }

  .queue-item.error .queue-item-icon {
    color: var(--color-error);
  }

  .queue-item.uploading .queue-item-icon {
    color: var(--color-primary);
  }

  .queue-item.pending .queue-item-icon {
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .queue-item-content {
    flex: 1;
    min-width: 0;
  }

  .queue-item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .queue-item-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .queue-item-size {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .queue-item-progress {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .progress-bar {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), #60a5fa);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-percent {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .progress-speed {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .queue-item-error {
    font-size: 0.75rem;
    color: var(--color-error);
  }

  .queue-item-completed {
    font-size: 0.75rem;
    color: #10b981;
  }

  .queue-item-pending {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .queue-item-actions {
    flex-shrink: 0;
    display: flex;
    gap: 0.375rem;
  }

  .btn-cancel,
  .btn-retry,
  .btn-remove {
    padding: 0.375rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-cancel {
    color: var(--color-error);
  }

  .btn-cancel:hover {
    background: var(--color-error);
    color: white;
    border-color: var(--color-error);
  }

  .btn-retry {
    color: var(--color-primary);
  }

  .btn-retry:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .btn-remove {
    color: var(--color-text-secondary);
  }

  .btn-remove:hover {
    background: var(--color-background);
    color: var(--color-text);
  }

  /* Position adjustment for asset manager with upload queue */
  .asset-manager {
    position: relative;
  }
</style>
