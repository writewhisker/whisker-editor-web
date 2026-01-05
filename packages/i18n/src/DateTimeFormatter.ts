/**
 * Date and Time Formatting
 * Uses Intl.DateTimeFormat and Intl.RelativeTimeFormat
 */

/**
 * Date style presets
 */
export type DateStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Time style presets
 */
export type TimeStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Relative time unit
 */
export type RelativeTimeUnit =
  | 'second'
  | 'seconds'
  | 'minute'
  | 'minutes'
  | 'hour'
  | 'hours'
  | 'day'
  | 'days'
  | 'week'
  | 'weeks'
  | 'month'
  | 'months'
  | 'year'
  | 'years';

/**
 * Relative time style
 */
export type RelativeTimeStyle = 'long' | 'short' | 'narrow';

/**
 * Date/Time format options
 */
export interface DateTimeFormatOptions {
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
  calendar?: string;
  hour12?: boolean;
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
  timeZone?: string;
  weekday?: 'long' | 'short' | 'narrow';
  era?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  fractionalSecondDigits?: 1 | 2 | 3;
  timeZoneName?: 'long' | 'short' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric';
}

/**
 * Relative time format options
 */
export interface RelativeTimeFormatOptions {
  style?: RelativeTimeStyle;
  numeric?: 'always' | 'auto';
}

/**
 * Date/Time formatter class
 */
export class DateTimeFormatter {
  private locale: string;
  private defaultOptions: DateTimeFormatOptions;

  constructor(locale: string = 'en', options?: DateTimeFormatOptions) {
    this.locale = locale;
    this.defaultOptions = options || {};
  }

  /**
   * Factory method
   */
  static create(locale?: string, options?: DateTimeFormatOptions): DateTimeFormatter {
    return new DateTimeFormatter(locale, options);
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
   * Format a date with preset style
   */
  format(date: Date | number | string, style: DateStyle = 'medium'): string {
    const d = this.toDate(date);
    if (!d) return String(date);

    return this.formatWithOptions(d, { dateStyle: style });
  }

  /**
   * Format time with preset style
   */
  formatTime(date: Date | number | string, style: TimeStyle = 'short'): string {
    const d = this.toDate(date);
    if (!d) return String(date);

    return this.formatWithOptions(d, { timeStyle: style });
  }

  /**
   * Format date and time with preset styles
   */
  formatDateTime(
    date: Date | number | string,
    dateStyle: DateStyle = 'medium',
    timeStyle: TimeStyle = 'short'
  ): string {
    const d = this.toDate(date);
    if (!d) return String(date);

    return this.formatWithOptions(d, { dateStyle, timeStyle });
  }

  /**
   * Format with custom options
   */
  formatWithOptions(date: Date | number | string, options: DateTimeFormatOptions): string {
    const d = this.toDate(date);
    if (!d) return String(date);

    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
      return d.toISOString();
    }

    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      return new Intl.DateTimeFormat(this.locale, mergedOptions as Intl.DateTimeFormatOptions).format(d);
    } catch {
      return d.toISOString();
    }
  }

  /**
   * Format with custom pattern
   * Supports: YYYY, YY, MM, M, DD, D, HH, H, mm, m, ss, s, SSS
   */
  formatPattern(date: Date | number | string, pattern: string): string {
    const d = this.toDate(date);
    if (!d) return String(date);

    const pad = (n: number, width: number = 2) => String(n).padStart(width, '0');

    return pattern
      .replace('YYYY', String(d.getFullYear()))
      .replace('YY', String(d.getFullYear()).slice(-2))
      .replace('MM', pad(d.getMonth() + 1))
      .replace('M', String(d.getMonth() + 1))
      .replace('DD', pad(d.getDate()))
      .replace('D', String(d.getDate()))
      .replace('HH', pad(d.getHours()))
      .replace('H', String(d.getHours()))
      .replace('mm', pad(d.getMinutes()))
      .replace('m', String(d.getMinutes()))
      .replace('ss', pad(d.getSeconds()))
      .replace('s', String(d.getSeconds()))
      .replace('SSS', pad(d.getMilliseconds(), 3));
  }

  /**
   * Format relative time (e.g., "2 days ago", "in 3 hours")
   */
  formatRelative(
    date: Date | number | string,
    baseDate: Date | number | string = new Date(),
    options?: RelativeTimeFormatOptions
  ): string {
    const d = this.toDate(date);
    const base = this.toDate(baseDate);
    if (!d || !base) return String(date);

    if (typeof Intl === 'undefined' || !Intl.RelativeTimeFormat) {
      return this.formatRelativeFallback(d, base);
    }

    const diffMs = d.getTime() - base.getTime();
    const { value, unit } = this.getRelativeTimeUnit(diffMs);

    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, {
        style: options?.style || 'long',
        numeric: options?.numeric || 'auto',
      });
      return rtf.format(value, unit);
    } catch {
      return this.formatRelativeFallback(d, base);
    }
  }

  /**
   * Format relative time from now
   */
  formatRelativeFromNow(date: Date | number | string, options?: RelativeTimeFormatOptions): string {
    return this.formatRelative(date, new Date(), options);
  }

  /**
   * Get the best unit and value for relative time
   */
  private getRelativeTimeUnit(diffMs: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
    const absDiff = Math.abs(diffMs);
    const sign = diffMs < 0 ? -1 : 1;

    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    if (absDiff < MINUTE) {
      return { value: sign * Math.round(absDiff / SECOND), unit: 'second' };
    }
    if (absDiff < HOUR) {
      return { value: sign * Math.round(absDiff / MINUTE), unit: 'minute' };
    }
    if (absDiff < DAY) {
      return { value: sign * Math.round(absDiff / HOUR), unit: 'hour' };
    }
    if (absDiff < WEEK) {
      return { value: sign * Math.round(absDiff / DAY), unit: 'day' };
    }
    if (absDiff < MONTH) {
      return { value: sign * Math.round(absDiff / WEEK), unit: 'week' };
    }
    if (absDiff < YEAR) {
      return { value: sign * Math.round(absDiff / MONTH), unit: 'month' };
    }
    return { value: sign * Math.round(absDiff / YEAR), unit: 'year' };
  }

  /**
   * Fallback relative time formatting
   */
  private formatRelativeFallback(date: Date, base: Date): string {
    const diffMs = date.getTime() - base.getTime();
    const { value, unit } = this.getRelativeTimeUnit(diffMs);
    const absValue = Math.abs(value);
    const unitStr = absValue === 1 ? unit : `${unit}s`;

    if (value < 0) {
      return `${absValue} ${unitStr} ago`;
    } else if (value > 0) {
      return `in ${absValue} ${unitStr}`;
    } else {
      return 'now';
    }
  }

  /**
   * Format ordinal (1st, 2nd, 3rd, etc.)
   */
  formatOrdinal(n: number): string {
    // Try Intl.PluralRules for ordinals
    if (typeof Intl !== 'undefined' && Intl.PluralRules) {
      try {
        const pr = new Intl.PluralRules(this.locale, { type: 'ordinal' });
        const rule = pr.select(n);

        // English ordinal suffixes
        const suffixes: Record<string, string> = {
          one: 'st',
          two: 'nd',
          few: 'rd',
          other: 'th',
        };

        // For non-English, we may need locale-specific handling
        const lang = this.locale.split('-')[0];
        if (lang === 'en') {
          return `${n}${suffixes[rule] || 'th'}`;
        }

        // For other languages, just return the number
        // A full implementation would need locale-specific ordinal rules
        return String(n);
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
   * Get day name
   */
  getDayName(date: Date | number | string, style: 'long' | 'short' | 'narrow' = 'long'): string {
    const d = this.toDate(date);
    if (!d) return '';

    return this.formatWithOptions(d, { weekday: style });
  }

  /**
   * Get month name
   */
  getMonthName(date: Date | number | string, style: 'long' | 'short' | 'narrow' = 'long'): string {
    const d = this.toDate(date);
    if (!d) return '';

    return this.formatWithOptions(d, { month: style });
  }

  /**
   * Get era
   */
  getEra(date: Date | number | string, style: 'long' | 'short' | 'narrow' = 'long'): string {
    const d = this.toDate(date);
    if (!d) return '';

    return this.formatWithOptions(d, { era: style, year: 'numeric' }).replace(/\d+/g, '').trim();
  }

  /**
   * Get time zone name
   */
  getTimeZoneName(
    date: Date | number | string,
    style: 'long' | 'short' = 'short'
  ): string {
    const d = this.toDate(date);
    if (!d) return '';

    const formatted = this.formatWithOptions(d, { timeZoneName: style, hour: 'numeric' });
    // Extract timezone from formatted string (after the time)
    const parts = formatted.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /**
   * Convert input to Date
   */
  private toDate(input: Date | number | string): Date | null {
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /**
   * Check if Intl.DateTimeFormat is available
   */
  static isSupported(): boolean {
    return typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat !== 'undefined';
  }

  /**
   * Check if Intl.RelativeTimeFormat is available
   */
  static isRelativeTimeSupported(): boolean {
    return typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined';
  }
}
