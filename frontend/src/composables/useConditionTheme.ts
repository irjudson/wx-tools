interface ConditionInput {
  rain_rate_in_hr: number | null;
  solar_radiation_wm2: number | null;
}

interface ConditionTheme {
  label: string;
  icon: string;
  gradient: string;
  textColor: string;
  accentColor: string;
}

export function useConditionTheme() {
  function getConditionTheme(data: ConditionInput): ConditionTheme {
    if (data.rain_rate_in_hr !== null && data.rain_rate_in_hr > 0) {
      return {
        label: 'Rainy',
        icon: '🌧️',
        gradient: 'from-indigo-700 via-violet-600 to-indigo-500',
        textColor: 'text-indigo-50',
        accentColor: 'ring-indigo-400',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 < 10) {
      return {
        label: 'Night',
        icon: '🌙',
        gradient: 'from-slate-900 via-slate-800 to-gray-700',
        textColor: 'text-slate-100',
        accentColor: 'ring-slate-500',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 400) {
      return {
        label: 'Sunny',
        icon: '☀️',
        gradient: 'from-amber-400 via-orange-400 to-yellow-300',
        textColor: 'text-amber-950',
        accentColor: 'ring-amber-300',
      };
    }

    if (data.solar_radiation_wm2 !== null && data.solar_radiation_wm2 >= 10) {
      return {
        label: 'Cloudy',
        icon: '☁️',
        gradient: 'from-slate-500 via-gray-500 to-slate-400',
        textColor: 'text-slate-50',
        accentColor: 'ring-slate-300',
      };
    }

    return {
      label: 'Unknown',
      icon: '❓',
      gradient: 'from-gray-600 to-gray-500',
      textColor: 'text-gray-100',
      accentColor: 'ring-gray-400',
    };
  }

  return { getConditionTheme };
}
