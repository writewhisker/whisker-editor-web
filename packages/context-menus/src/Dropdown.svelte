<script lang="ts">
  import type { DropdownOption } from './types';

  interface Props {
    value?: string;
    options?: DropdownOption[];
    placeholder?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
  }

  let {
    value,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    onChange,
  }: Props = $props();

  let open = $state(false);

  const selectedOption = $derived(options.find(opt => opt.value === value));

  function toggleOpen() {
    if (!disabled) {
      open = !open;
    }
  }

  function selectOption(option: DropdownOption) {
    if (!option.disabled) {
      onChange?.(option.value);
      open = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="dropdown" class:disabled>
  <button class="dropdown-trigger" onclick={toggleOpen}>
    <span class="trigger-content">
      {#if selectedOption?.icon}
        <span class="icon">{selectedOption.icon}</span>
      {/if}
      <span class="label">{selectedOption?.label || placeholder}</span>
    </span>
    <span class="arrow">{open ? '▲' : '▼'}</span>
  </button>
  {#if open}
    <div class="dropdown-menu">
      {#each options as option (option.value)}
        <button
          class="dropdown-item"
          class:selected={option.value === value}
          class:disabled={option.disabled}
          onclick={() => selectOption(option)}
        >
          {#if option.icon}
            <span class="icon">{option.icon}</span>
          {/if}
          <span class="label">{option.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown {
    position: relative;
    width: 100%;
  }

  .dropdown.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dropdown-trigger {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }

  .dropdown-trigger:hover:not(:disabled) {
    border-color: #9ca3af;
  }

  .dropdown-trigger:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .trigger-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    z-index: 100;
    max-height: 240px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    transition: background 0.15s;
  }

  .dropdown-item:hover:not(.disabled) {
    background: #f3f4f6;
  }

  .dropdown-item.selected {
    background: #e0e7ff;
    color: #3730a3;
  }

  .dropdown-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 16px;
  }

  .arrow {
    font-size: 10px;
    color: #6b7280;
  }
</style>
