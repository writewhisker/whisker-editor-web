/**
 * Number Formatting
 * Uses Intl.NumberFormat for locale-aware number formatting
 */

/**
 * Number style
 */
export type NumberStyle = 'decimal' | 'currency' | 'percent' | 'unit';

/**
 * Compact display style
 */
export type CompactDisplay = 'short' | 'long';

/**
 * Currency display style
 */
export type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/**
 * Unit display style
 */
export type UnitDisplay = 'short' | 'long' | 'narrow';

/**
 * Sign display
 */
export type SignDisplay = 'auto' | 'never' | 'always' | 'exceptZero';

/**
 * Number notation
 */
export type Notation = 'standard' | 'scientific' | 'engineering' | 'compact';

/**
 * Common units supported by Intl.NumberFormat
 */
export type Unit =
  // Length
  | 'kilometer' | 'meter' | 'centimeter' | 'millimeter' | 'mile' | 'yard' | 'foot' | 'inch'
  // Area
  | 'square-kilometer' | 'square-meter' | 'square-mile' | 'acre' | 'hectare'
  // Volume
  | 'liter' | 'milliliter' | 'gallon' | 'fluid-ounce'
  // Mass
  | 'kilogram' | 'gram' | 'milligram' | 'pound' | 'ounce'
  // Duration
  | 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'
  // Speed
  | 'kilometer-per-hour' | 'mile-per-hour' | 'meter-per-second'
  // Temperature
  | 'celsius' | 'fahrenheit'
  // Digital
  | 'bit' | 'byte' | 'kilobit' | 'kilobyte' | 'megabit' | 'megabyte' | 'gigabit' | 'gigabyte' | 'terabit' | 'terabyte'
  // Other
  | 'percent';

/**
 * Number format options
 */
export interface NumberFormatOptions {
  style?: NumberStyle;
  currency?: string;
  currencyDisplay?: CurrencyDisplay;
  currencySign?: 'standard' | 'accounting';
  unit?: Unit | string;
  unitDisplay?: UnitDisplay;
  notation?: Notation;
  compactDisplay?: CompactDisplay;
  signDisplay?: SignDisplay;
  useGrouping?: boolean | 'min2' | 'auto' | 'always';
  minimumIntegerDigits?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
  roundingMode?: 'ceil' | 'floor' | 'expand' | 'trunc' | 'halfCeil' | 'halfFloor' | 'halfExpand' | 'halfTrunc' | 'halfEven';
}

/**
 * Number formatter class
 */
export class NumberFormatter {
  private locale: string;
  private defaultOptions: NumberFormatOptions;

  constructor(locale: string = 'en', options?: NumberFormatOptions) {
    this.locale = locale;
    this.defaultOptions = options || {};
  }

  /**
   * Factory method
   */
  static create(locale?: string, options?: NumberFormatOptions): NumberFormatter {
    return new NumberFormatter(locale, options);
  }

  /**
   * Set locale
   */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Format a number with default options
   */
  format(value: number): string {
    return this.formatWithOptions(value, {});
  }

  /**
   * Format with custom options
   */
  formatWithOptions(value: number, options: NumberFormatOptions): string {
    if (typeof Intl === 'undefined' || !Intl.NumberFormat) {
      return this.formatFallback(value, options);
    }

    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      return new Intl.NumberFormat(this.locale, mergedOptions as Intl.NumberFormatOptions).format(value);
    } catch {
      return this.formatFallback(value, options);
    }
  }

  /**
   * Format as integer (no decimal places)
   */
  formatInteger(value: number): string {
    return this.formatWithOptions(value, {
      maximumFractionDigits: 0,
    });
  }

  /**
   * Format with fixed decimal places
   */
  formatDecimal(value: number, decimalPlaces: number = 2): string {
    return this.formatWithOptions(value, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }

  /**
   * Format as currency
   */
  formatCurrency(
    value: number,
    currency: string = 'USD',
    display: CurrencyDisplay = 'symbol'
  ): string {
    return this.formatWithOptions(value, {
      style: 'currency',
      currency,
      currencyDisplay: display,
    });
  }

  /**
   * Format as percent
   */
  formatPercent(value: number, decimalPlaces: number = 0): string {
    return this.formatWithOptions(value, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }

  /**
   * Format with unit (e.g., "5 kilometers", "3 MB")
   */
  formatUnit(value: number, unit: Unit | string, display: UnitDisplay = 'short'): string {
    return this.formatWithOptions(value, {
      style: 'unit',
      unit,
      unitDisplay: display,
    });
  }

  /**
   * Format in compact notation (e.g., "1.2K", "3.4M", "5.6B")
   */
  formatCompact(value: number, display: CompactDisplay = 'short'): string {
    return this.formatWithOptions(value, {
      notation: 'compact',
      compactDisplay: display,
    });
  }

  /**
   * Format in scientific notation (e.g., "1.23E4")
   */
  formatScientific(value: number, decimalPlaces: number = 2): string {
    return this.formatWithOptions(value, {
      notation: 'scientific',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }

  /**
   * Format in engineering notation (e.g., "12.3E3")
   */
  formatEngineering(value: number, decimalPlaces: number = 2): string {
    return this.formatWithOptions(value, {
      notation: 'engineering',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }

  /**
   * Format with sign always shown
   */
  formatSigned(value: number): string {
    return this.formatWithOptions(value, {
      signDisplay: 'always',
    });
  }

  /**
   * Format file size (bytes to human-readable)
   */
  formatFileSize(bytes: number, binary: boolean = false): string {
    const units = binary
      ? ['byte', 'kibibyte', 'mebibyte', 'gibibyte', 'tebibyte']
      : ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
    const base = binary ? 1024 : 1000;

    if (bytes === 0) {
      return this.formatUnit(0, 'byte', 'long');
    }

    const exp = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, exp);
    const unit = units[exp];

    // Use short format for file sizes
    return this.formatWithOptions(value, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: exp > 0 ? 1 : 0,
    });
  }

  /**
   * Format duration in appropriate unit
   */
  formatDuration(seconds: number, display: UnitDisplay = 'long'): string {
    const abs = Math.abs(seconds);

    if (abs < 60) {
      return this.formatUnit(seconds, 'second', display);
    }
    if (abs < 3600) {
      return this.formatUnit(seconds / 60, 'minute', display);
    }
    if (abs < 86400) {
      return this.formatUnit(seconds / 3600, 'hour', display);
    }
    if (abs < 604800) {
      return this.formatUnit(seconds / 86400, 'day', display);
    }
    if (abs < 2592000) {
      return this.formatUnit(seconds / 604800, 'week', display);
    }
    if (abs < 31536000) {
      return this.formatUnit(seconds / 2592000, 'month', display);
    }
    return this.formatUnit(seconds / 31536000, 'year', display);
  }

  /**
   * Format ordinal (1st, 2nd, 3rd, etc.)
   */
  formatOrdinal(n: number): string {
    if (typeof Intl !== 'undefined' && Intl.PluralRules) {
      try {
        const pr = new Intl.PluralRules(this.locale, { type: 'ordinal' });
        const rule = pr.select(n);

        // English ordinal suffixes
        const lang = this.locale.split('-')[0];
        if (lang === 'en') {
          const suffixes: Record<string, string> = {
            one: 'st',
            two: 'nd',
            few: 'rd',
            other: 'th',
          };
          return `${this.format(n)}${suffixes[rule] || 'th'}`;
        }

        // For non-English, add locale-specific ordinal indicators
        // This is a simplified version
        return this.format(n);
      } catch {
        return this.formatOrdinalFallback(n);
      }
    }

    return this.formatOrdinalFallback(n);
  }

  /**
   * Fallback ordinal formatting (English)
   */
  private formatOrdinalFallback(n: number): string {
    const abs = Math.abs(n);
    const mod10 = abs % 10;
    const mod100 = abs % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return `${n}st`;
    }
    if (mod10 === 2 && mod100 !== 12) {
      return `${n}nd`;
    }
    if (mod10 === 3 && mod100 !== 13) {
      return `${n}rd`;
    }
    return `${n}th`;
  }

  /**
   * Format range (e.g., "1-5")
   */
  formatRange(start: number, end: number): string {
    if (typeof Intl !== 'undefined' && (Intl.NumberFormat as { prototype: { formatRange?: unknown } }).prototype?.formatRange) {
      try {
        const formatter = new Intl.NumberFormat(this.locale, this.defaultOptions as Intl.NumberFormatOptions);
        // @ts-expect-error - formatRange is newer API
        return formatter.formatRange(start, end);
      } catch {
        return `${this.format(start)}–${this.format(end)}`;
      }
    }
    return `${this.format(start)}–${this.format(end)}`;
  }

  /**
   * Parse a formatted number string back to number
   */
  parse(formatted: string): number | null {
    // Get locale-specific decimal and group separators
    const parts = new Intl.NumberFormat(this.locale).formatToParts(1234.5);
    const decimalSep = parts.find((p) => p.type === 'decimal')?.value || '.';
    const groupSep = parts.find((p) => p.type === 'group')?.value || ',';

    // Remove group separators and normalize decimal
    let normalized = formatted.replace(new RegExp(`\\${groupSep}`, 'g'), '');
    normalized = normalized.replace(decimalSep, '.');

    // Remove currency symbols and other non-numeric characters (except - and .)
    normalized = normalized.replace(/[^0-9.\-]/g, '');

    const result = parseFloat(normalized);
    return isNaN(result) ? null : result;
  }

  /**
   * Fallback formatting without Intl
   */
  private formatFallback(value: number, options: NumberFormatOptions): string {
    const { style, minimumFractionDigits = 0, maximumFractionDigits = 2 } = options;

    let formatted = value.toFixed(Math.max(minimumFractionDigits, Math.min(maximumFractionDigits, 20)));

    // Remove trailing zeros if not required
    if (minimumFractionDigits < maximumFractionDigits) {
      formatted = parseFloat(formatted).toString();
    }

    if (style === 'percent') {
      return `${(value * 100).toFixed(maximumFractionDigits)}%`;
    }

    if (style === 'currency' && options.currency) {
      return `${options.currency} ${formatted}`;
    }

    return formatted;
  }

  /**
   * Get decimal separator for current locale
   */
  getDecimalSeparator(): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const parts = new Intl.NumberFormat(this.locale).formatToParts(1.1);
      return parts.find((p) => p.type === 'decimal')?.value || '.';
    }
    return '.';
  }

  /**
   * Get grouping separator for current locale
   */
  getGroupingSeparator(): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const parts = new Intl.NumberFormat(this.locale).formatToParts(1000);
      return parts.find((p) => p.type === 'group')?.value || ',';
    }
    return ',';
  }

  /**
   * Get currency symbol for a currency code
   */
  getCurrencySymbol(currency: string): string {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        const parts = new Intl.NumberFormat(this.locale, {
          style: 'currency',
          currency,
          currencyDisplay: 'symbol',
        }).formatToParts(0);
        return parts.find((p) => p.type === 'currency')?.value || currency;
      } catch {
        return currency;
      }
    }
    return currency;
  }

  /**
   * Check if Intl.NumberFormat is available
   */
  static isSupported(): boolean {
    return typeof Intl !== 'undefined' && typeof Intl.NumberFormat !== 'undefined';
  }
}
