import { describe, it, expect } from 'vitest';
import { useConditionTheme } from './useConditionTheme';

describe('useConditionTheme', () => {
  it('returns rainy theme when rain rate > 0', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0.5, solar_radiation_wm2: 200 });
    expect(theme.label).toBe('Rainy');
    expect(theme.gradient).toContain('indigo');
  });

  it('returns night theme when solar < 10', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 5 });
    expect(theme.label).toBe('Night');
    expect(theme.gradient).toContain('slate');
  });

  it('returns sunny theme when solar >= 400', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 600 });
    expect(theme.label).toBe('Sunny');
    expect(theme.gradient).toContain('amber');
  });

  it('returns cloudy theme when solar 10-399', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: 0, solar_radiation_wm2: 150 });
    expect(theme.label).toBe('Cloudy');
    expect(theme.gradient).toContain('slate');
  });

  it('returns unknown theme when data missing', () => {
    const { getConditionTheme } = useConditionTheme();
    const theme = getConditionTheme({ rain_rate_in_hr: null, solar_radiation_wm2: null });
    expect(theme.label).toBe('Unknown');
  });
});
