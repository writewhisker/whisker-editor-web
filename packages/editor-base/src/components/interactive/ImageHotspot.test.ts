import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ImageHotspot from './ImageHotspot.svelte';
import type { Hotspot } from './ImageHotspot.svelte';

describe('ImageHotspot', () => {
  let onImageLoad: ReturnType<typeof vi.fn>;
  let onImageError: ReturnType<typeof vi.fn>;
  let onHotspotClick: ReturnType<typeof vi.fn>;
  let onHotspotHover: ReturnType<typeof vi.fn>;

  const mockHotspots: Hotspot[] = [
    {
      id: 'hotspot1',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      label: 'First Hotspot',
      description: 'This is the first hotspot',
      action: 'action1',
    },
    {
      id: 'hotspot2',
      x: 50,
      y: 60,
      width: 20,
      height: 20,
      label: 'Second Hotspot',
      description: 'This is the second hotspot',
      action: 'action2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    onImageLoad = vi.fn();
    onImageError = vi.fn();
    onHotspotClick = vi.fn();
    onHotspotHover = vi.fn();
  });

  describe('rendering', () => {
    it('should render image with correct src', () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img.src).toContain('example.com/image.jpg');
    });

    it('should render image with alt text', () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        imageAlt: 'Test image',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img.alt).toBe('Test image');
    });

    it('should render default alt text when not provided', () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img.alt).toBe('Interactive image');
    });

    it('should show loading overlay initially', () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      expect(container.textContent).toContain('Loading image...');
    });

    it('should render hotspots after image loads', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspotButtons = container.querySelectorAll('.hotspot');
      expect(hotspotButtons.length).toBe(2);
    });

    it('should not render hotspots before image loads', () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const hotspotButtons = container.querySelectorAll('.hotspot');
      expect(hotspotButtons.length).toBe(0);
    });

    it('should render hotspot labels when showLabels is true', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        showLabels: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      expect(container.textContent).toContain('First Hotspot');
      expect(container.textContent).toContain('Second Hotspot');
    });

    it('should not render hotspot labels when showLabels is false', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        showLabels: false,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const labels = container.querySelectorAll('.hotspot-label');
      expect(labels.length).toBe(0);
    });
  });

  describe('image loading', () => {
    it('should dispatch imageLoad event when image loads', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      (component as any).$on('imageLoad', onImageLoad);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      expect(onImageLoad).toHaveBeenCalled();
    });

    it('should hide loading overlay after image loads', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const loadingOverlay = container.querySelector('.loading-overlay');
      expect(loadingOverlay).toBeFalsy();
    });

    it('should dispatch imageError event on load failure', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/invalid.jpg',
        hotspots: [],
      });

      (component as any).$on('imageError', onImageError);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.error(img);

      expect(onImageError).toHaveBeenCalled();
    });

    it('should show error state when image fails to load', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/invalid.jpg',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.error(img);

      expect(container.textContent).toContain('Failed to load image');
    });
  });

  describe('hotspot interactions', () => {
    it('should dispatch hotspotClick event when hotspot clicked', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      (component as any).$on('hotspotClick', onHotspotClick);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.click(hotspot);

      expect(onHotspotClick).toHaveBeenCalled();
      expect(onHotspotClick.mock.calls[0][0].detail.id).toBe('hotspot1');
      expect(onHotspotClick.mock.calls[0][0].detail.action).toBe('action1');
    });

    it('should not dispatch click when disabled', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        disabled: true,
      });

      (component as any).$on('hotspotClick', onHotspotClick);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.click(hotspot);

      expect(onHotspotClick).not.toHaveBeenCalled();
    });

    it('should dispatch hotspotHover event on mouse enter', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      (component as any).$on('hotspotHover', onHotspotHover);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      expect(onHotspotHover).toHaveBeenCalled();
      expect(onHotspotHover.mock.calls[0][0].detail.id).toBe('hotspot1');
    });

    it('should not dispatch hover when highlightOnHover is false', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: false,
      });

      (component as any).$on('hotspotHover', onHotspotHover);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      expect(onHotspotHover).not.toHaveBeenCalled();
    });

    it('should show tooltip on hover', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      expect(container.textContent).toContain('This is the first hotspot');
    });

    it('should hide tooltip on mouse leave', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);
      await fireEvent.mouseLeave(hotspot);

      const tooltip = container.querySelector('.hotspot-tooltip');
      expect(tooltip).toBeFalsy();
    });
  });

  describe('hotspot positioning', () => {
    it('should position hotspots using percentage coordinates', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLElement;
      expect(hotspot.style.left).toBe('10%');
      expect(hotspot.style.top).toBe('20%');
      expect(hotspot.style.width).toBe('30%');
      expect(hotspot.style.height).toBe('40%');
    });

    it('should position second hotspot correctly', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[1] as HTMLElement;
      expect(hotspot.style.left).toBe('50%');
      expect(hotspot.style.top).toBe('60%');
      expect(hotspot.style.width).toBe('20%');
      expect(hotspot.style.height).toBe('20%');
    });
  });

  describe('selected state', () => {
    it('should mark hotspot as selected when clicked', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.click(hotspot);

      expect(hotspot.className).toContain('selected');
    });

    it('should show selected info panel when hotspot clicked', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.click(hotspot);

      expect(container.textContent).toContain('First Hotspot');
      expect(container.textContent).toContain('This is the first hotspot');
    });

    it('should close selected info panel when close button clicked', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.click(hotspot);

      const closeButton = container.querySelector('.close-btn') as HTMLButtonElement;
      await fireEvent.click(closeButton);

      const selectedInfo = container.querySelector('.selected-info');
      expect(selectedInfo).toBeFalsy();
    });

    it('should unmark previously selected hotspot when new one selected', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspots = container.querySelectorAll('.hotspot');
      await fireEvent.click(hotspots[0]);

      expect(hotspots[0].className).toContain('selected');

      await fireEvent.click(hotspots[1]);

      expect(hotspots[0].className).not.toContain('selected');
      expect(hotspots[1].className).toContain('selected');
    });
  });

  describe('hover state', () => {
    it('should apply hovered class on mouse enter', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      expect(hotspot.className).toContain('hovered');
    });

    it('should remove hovered class on mouse leave', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);
      await fireEvent.mouseLeave(hotspot);

      expect(hotspot.className).not.toContain('hovered');
    });

    it('should not apply hover effects when disabled', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        disabled: true,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      expect(hotspot.className).not.toContain('hovered');
    });
  });

  describe('accessibility', () => {
    it('should have accessible labels for hotspots', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelectorAll('.hotspot')[0] as HTMLButtonElement;
      expect(hotspot.getAttribute('aria-label')).toBe('First Hotspot');
    });

    it('should use fallback aria-label when no label provided', async () => {
      const hotspotsWithoutLabel: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: hotspotsWithoutLabel,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      expect(hotspot.getAttribute('aria-label')).toBe('Hotspot hotspot1');
    });

    it('should have disabled attribute when disabled', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        disabled: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspots = container.querySelectorAll('.hotspot');
      hotspots.forEach(hotspot => {
        expect((hotspot as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should have close button with accessible label', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.click(hotspot);

      const closeButton = container.querySelector('.close-btn');
      expect(closeButton?.getAttribute('aria-label')).toBe('Close');
    });
  });

  describe('tooltip display', () => {
    it('should show tooltip title when available', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      const tooltipTitle = container.querySelector('.tooltip-title');
      expect(tooltipTitle?.textContent).toBe('First Hotspot');
    });

    it('should show tooltip description', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      const tooltipDesc = container.querySelector('.tooltip-description');
      expect(tooltipDesc?.textContent).toBe('This is the first hotspot');
    });

    it('should not show tooltip when no description', async () => {
      const hotspotsWithoutDesc: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          label: 'Test',
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: hotspotsWithoutDesc,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      const tooltip = container.querySelector('.hotspot-tooltip');
      expect(tooltip).toBeFalsy();
    });
  });

  describe('selected info panel', () => {
    it('should show selected info with icon', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.click(hotspot);

      const infoIcon = container.querySelector('.info-icon');
      expect(infoIcon?.textContent).toBeTruthy();
    });

    it('should show default label when hotspot has no label', async () => {
      const hotspotsWithoutLabel: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          description: 'Test description',
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: hotspotsWithoutLabel,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.click(hotspot);

      expect(container.textContent).toContain('Selected Area');
    });

    it('should show description in info panel when available', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.click(hotspot);

      const infoDesc = container.querySelector('.info-description');
      expect(infoDesc?.textContent).toBe('This is the first hotspot');
    });
  });

  describe('edge cases', () => {
    it('should handle empty hotspots array', async () => {
      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: [],
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspots = container.querySelectorAll('.hotspot');
      expect(hotspots.length).toBe(0);
    });

    it('should handle hotspot with zero dimensions', async () => {
      const zeroHotspot: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: zeroHotspot,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLElement;
      expect(hotspot.style.width).toBe('0%');
      expect(hotspot.style.height).toBe('0%');
    });

    it('should handle hotspot with 100% dimensions', async () => {
      const fullHotspot: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: fullHotspot,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLElement;
      expect(hotspot.style.width).toBe('100%');
      expect(hotspot.style.height).toBe('100%');
    });

    it('should handle rapid hover changes', async () => {
      const { container, component } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: mockHotspots,
        highlightOnHover: true,
      });

      (component as any).$on('hotspotHover', onHotspotHover);

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspots = container.querySelectorAll('.hotspot');

      for (let i = 0; i < 5; i++) {
        await fireEvent.mouseEnter(hotspots[0]);
        await fireEvent.mouseLeave(hotspots[0]);
      }

      expect(onHotspotHover).toHaveBeenCalled();
    });

    it('should handle hotspot with very long description', async () => {
      const longDescHotspot: Hotspot[] = [
        {
          id: 'hotspot1',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          label: 'Test',
          description: 'a'.repeat(500),
        },
      ];

      const { container } = render(ImageHotspot, {
        imageUrl: 'https://example.com/image.jpg',
        hotspots: longDescHotspot,
        highlightOnHover: true,
      });

      const img = container.querySelector('img') as HTMLImageElement;
      await fireEvent.load(img);

      const hotspot = container.querySelector('.hotspot') as HTMLButtonElement;
      await fireEvent.mouseEnter(hotspot);

      const tooltip = container.querySelector('.hotspot-tooltip');
      expect(tooltip?.textContent).toContain('a'.repeat(500));
    });
  });
});
