<script lang="ts">
  /**
   * Kids Parental Controls Panel
   *
   * Password-protected settings panel for parents to control kids mode features.
   */

  import { parentalControlsStore, parentalControlsActions } from '../../stores/parentalControlsStore';
  import type { ContentFilterLevel } from '../../stores/parentalControlsStore';
  import { notificationStore } from '../../stores/notificationStore';

  export let show = false;

  let pinInput = '';
  let newPin = '';
  let confirmPin = '';
  let isUnlocked = false;
  let showSetPin = false;
  let showActivityLog = false;

  // Local state for settings (before saving)
  let exportRestricted = false;
  let allowLocalExport = true;
  let allowOnlineSharing = false;
  let contentFilterLevel: ContentFilterLevel = 'moderate';
  let requireApprovalForExport = false;
  let maxSessionTime: number | null = null;

  // Load current settings
  $: if (show) {
    exportRestricted = $parentalControlsStore.exportRestricted;
    allowLocalExport = $parentalControlsStore.allowLocalExport;
    allowOnlineSharing = $parentalControlsStore.allowOnlineSharing;
    contentFilterLevel = $parentalControlsStore.contentFilterLevel;
    requireApprovalForExport = $parentalControlsStore.requireApprovalForExport;
    maxSessionTime = $parentalControlsStore.maxSessionTime;
  }

  function handleUnlock() {
    if (parentalControlsActions.verifyPIN(pinInput)) {
      isUnlocked = true;
      pinInput = '';
    } else {
      notificationStore.error('Incorrect PIN. Please try again.');
      pinInput = '';
    }
  }

  function handleSetPin() {
    if (newPin !== confirmPin) {
      notificationStore.error('PINs do not match.');
      return;
    }

    if (newPin.length < 4) {
      notificationStore.error('PIN must be at least 4 digits.');
      return;
    }

    parentalControlsActions.setPIN(newPin);
    parentalControlsActions.setEnabled(true);
    notificationStore.success('PIN set successfully!');
    showSetPin = false;
    newPin = '';
    confirmPin = '';
  }

  function handleSaveSettings() {
    parentalControlsActions.setExportRestricted(exportRestricted);
    parentalControlsActions.setAllowLocalExport(allowLocalExport);
    parentalControlsActions.setAllowOnlineSharing(allowOnlineSharing);
    parentalControlsActions.setContentFilterLevel(contentFilterLevel);
    parentalControlsActions.setRequireApprovalForExport(requireApprovalForExport);
    parentalControlsActions.setMaxSessionTime(maxSessionTime);

    notificationStore.success('Settings saved!');
  }

  function handleClose() {
    show = false;
    isUnlocked = false;
    pinInput = '';
    showSetPin = false;
    showActivityLog = false;
  }

  function handleClearLog() {
    if (confirm('Are you sure you want to clear the activity log?')) {
      parentalControlsActions.clearActivityLog();
      notificationStore.success('Activity log cleared.');
    }
  }

  // Check if PIN is required
  $: needsUnlock = show && !isUnlocked && parentalControlsActions.isPINRequired();
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="parental-controls-title"
  >
    <div
      class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-8 transform transition-all max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">🔒</div>
        <h2 id="parental-controls-title" class="text-4xl font-black text-gray-800 mb-2">
          Parental Controls
        </h2>
        <p class="text-lg text-gray-600 font-semibold">
          Manage safety and permissions for Kids Mode
        </p>
      </div>

      {#if needsUnlock}
        <!-- PIN Entry Screen -->
        <div class="max-w-md mx-auto">
          <div class="bg-blue-50 rounded-2xl p-8 border-4 border-blue-300">
            <h3 class="text-2xl font-black text-blue-900 mb-4 text-center">
              Enter Parent PIN
            </h3>
            <input
              type="password"
              bind:value={pinInput}
              placeholder="Enter PIN"
              class="w-full px-6 py-4 text-2xl rounded-xl border-4 border-blue-400 focus:border-blue-600 focus:outline-none text-center font-bold mb-4"
              on:keydown={(e) => e.key === 'Enter' && handleUnlock()}
              autofocus
            />
            <div class="flex gap-4">
              <button
                type="button"
                class="flex-1 px-6 py-4 rounded-2xl text-xl font-black bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105 transition-all"
                on:click={handleUnlock}
              >
                Unlock
              </button>
              <button
                type="button"
                class="px-6 py-4 rounded-2xl text-xl font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
                on:click={handleClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      {:else if showSetPin}
        <!-- Set PIN Screen -->
        <div class="max-w-md mx-auto">
          <div class="bg-green-50 rounded-2xl p-8 border-4 border-green-300">
            <h3 class="text-2xl font-black text-green-900 mb-4">Set Parent PIN</h3>
            <input
              type="password"
              bind:value={newPin}
              placeholder="New PIN (4+ digits)"
              class="w-full px-4 py-3 text-xl rounded-xl border-4 border-green-400 focus:border-green-600 focus:outline-none font-bold mb-4"
            />
            <input
              type="password"
              bind:value={confirmPin}
              placeholder="Confirm PIN"
              class="w-full px-4 py-3 text-xl rounded-xl border-4 border-green-400 focus:border-green-600 focus:outline-none font-bold mb-4"
              on:keydown={(e) => e.key === 'Enter' && handleSetPin()}
            />
            <div class="flex gap-4">
              <button
                type="button"
                class="flex-1 px-6 py-4 rounded-2xl text-xl font-black bg-green-600 text-white hover:bg-green-700 transform hover:scale-105 transition-all"
                on:click={handleSetPin}
              >
                Set PIN
              </button>
              <button
                type="button"
                class="px-6 py-4 rounded-2xl text-xl font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
                on:click={() => showSetPin = false}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      {:else if showActivityLog}
        <!-- Activity Log Screen -->
        <div>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-3xl font-black text-gray-800">Activity Log</h3>
            <div class="flex gap-4">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-bold bg-red-100 text-red-700 hover:bg-red-200"
                on:click={handleClearLog}
              >
                Clear Log
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300"
                on:click={() => showActivityLog = false}
              >
                Back
              </button>
            </div>
          </div>

          <div class="bg-gray-50 rounded-2xl p-6 border-4 border-gray-300 max-h-96 overflow-y-auto">
            {#if $parentalControlsStore.activityLog.length === 0}
              <p class="text-gray-500 text-center font-semibold py-8">
                No activity recorded yet.
              </p>
            {:else}
              <div class="space-y-3">
                {#each $parentalControlsStore.activityLog.slice().reverse() as entry}
                  <div class="bg-white rounded-xl p-4 border-2 border-gray-200">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1">
                        <div class="font-black text-gray-800">{entry.action}</div>
                        <div class="text-gray-600 font-semibold text-sm">{entry.details}</div>
                      </div>
                      <div class="text-gray-500 text-sm font-semibold whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Main Settings Screen -->
        <div class="space-y-6">
          <!-- PIN Management -->
          <div class="bg-purple-50 rounded-2xl p-6 border-4 border-purple-300">
            <h3 class="text-2xl font-black text-purple-900 mb-4">PIN Protection</h3>
            <p class="text-purple-700 font-semibold mb-4">
              Set a PIN to protect these settings from being changed by kids.
            </p>
            <button
              type="button"
              class="px-6 py-3 rounded-xl text-lg font-black bg-purple-600 text-white hover:bg-purple-700 transform hover:scale-105 transition-all"
              on:click={() => showSetPin = true}
            >
              {$parentalControlsStore.pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>

          <!-- Export Settings -->
          <div class="bg-blue-50 rounded-2xl p-6 border-4 border-blue-300">
            <h3 class="text-2xl font-black text-blue-900 mb-4">Export & Sharing</h3>

            <label class="flex items-center gap-3 mb-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={exportRestricted}
                class="w-6 h-6 rounded"
              />
              <span class="font-bold text-blue-800">Restrict all exports</span>
            </label>

            {#if !exportRestricted}
              <label class="flex items-center gap-3 mb-3 cursor-pointer ml-9">
                <input
                  type="checkbox"
                  bind:checked={allowLocalExport}
                  class="w-6 h-6 rounded"
                />
                <span class="font-bold text-blue-700">Allow local file exports</span>
              </label>

              <label class="flex items-center gap-3 mb-3 cursor-pointer ml-9">
                <input
                  type="checkbox"
                  bind:checked={allowOnlineSharing}
                  class="w-6 h-6 rounded"
                />
                <span class="font-bold text-blue-700">Allow online sharing</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer ml-9">
                <input
                  type="checkbox"
                  bind:checked={requireApprovalForExport}
                  class="w-6 h-6 rounded"
                />
                <span class="font-bold text-blue-700">Require approval for exports</span>
              </label>
            {/if}
          </div>

          <!-- Content Filter -->
          <div class="bg-green-50 rounded-2xl p-6 border-4 border-green-300">
            <h3 class="text-2xl font-black text-green-900 mb-4">Content Filter</h3>
            <p class="text-green-700 font-semibold mb-4">
              Filter inappropriate words and provide kid-friendly suggestions.
            </p>

            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  bind:group={contentFilterLevel}
                  value="none"
                  class="w-5 h-5"
                />
                <span class="font-bold text-green-800">None</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  bind:group={contentFilterLevel}
                  value="moderate"
                  class="w-5 h-5"
                />
                <span class="font-bold text-green-800">Mild</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  bind:group={contentFilterLevel}
                  value="strict"
                  class="w-5 h-5"
                />
                <span class="font-bold text-green-800">Strict</span>
              </label>
            </div>
          </div>

          <!-- Session Time (Optional Feature) -->
          <div class="bg-orange-50 rounded-2xl p-6 border-4 border-orange-300">
            <h3 class="text-2xl font-black text-orange-900 mb-4">Session Time Limit</h3>
            <p class="text-orange-700 font-semibold mb-4">
              Set a maximum time limit for each session (optional).
            </p>

            <div class="flex items-center gap-4">
              <input
                type="number"
                bind:value={maxSessionTime}
                placeholder="Minutes"
                min="0"
                class="w-32 px-4 py-2 rounded-xl border-4 border-orange-400 focus:border-orange-600 focus:outline-none font-bold"
              />
              <span class="font-bold text-orange-800">minutes (0 = unlimited)</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 pt-4">
            <button
              type="button"
              class="flex-1 px-8 py-4 rounded-2xl text-xl font-black bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-xl hover:scale-105 transform transition-all"
              on:click={handleSaveSettings}
            >
              💾 Save Settings
            </button>

            <button
              type="button"
              class="px-8 py-4 rounded-2xl text-lg font-black bg-purple-100 text-purple-700 hover:bg-purple-200 transform hover:scale-105 transition-all"
              on:click={() => showActivityLog = true}
            >
              📊 View Activity Log
            </button>

            <button
              type="button"
              class="px-8 py-4 rounded-2xl text-lg font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
              on:click={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
