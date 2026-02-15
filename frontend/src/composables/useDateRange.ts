import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function useDateRange() {
  const route = useRoute();
  const router = useRouter();

  const startDate = ref<Date>(new Date());
  const endDate = ref<Date>(new Date());
  const currentLabel = ref<string>('Last 24 Hours');

  // Initialize from URL params or default to last 24 hours
  const initializeFromUrl = () => {
    const startParam = route.query.start as string;
    const endParam = route.query.end as string;

    if (startParam && endParam) {
      const parsedStart = new Date(startParam);
      const parsedEnd = new Date(endParam);

      // Validate that dates are valid and start is before end
      if (
        !isNaN(parsedStart.getTime()) &&
        !isNaN(parsedEnd.getTime()) &&
        parsedStart <= parsedEnd
      ) {
        startDate.value = parsedStart;
        endDate.value = parsedEnd;
        currentLabel.value = 'Custom';
      } else {
        // Invalid dates, fall back to default preset
        applyPreset('24h');
      }
    } else {
      applyPreset('24h');
    }
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    const end = new Date(now);

    switch (preset) {
      case '24h':
        startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        currentLabel.value = 'Last 24 Hours';
        break;
      case '7d':
        startDate.value = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 7 Days';
        break;
      case '30d':
        startDate.value = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 30 Days';
        break;
      case '90d':
        startDate.value = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past 90 Days';
        break;
      case '1y':
        startDate.value = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        currentLabel.value = 'Past Year';
        break;
      case 'ytd':
        startDate.value = new Date(now.getFullYear(), 0, 1);
        currentLabel.value = 'Year to Date';
        break;
      default:
        startDate.value = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        currentLabel.value = 'Last 24 Hours';
    }
    endDate.value = end;
  };

  const applyCustomRange = (start: Date, end: Date) => {
    // Type guard: validate parameters are Date objects
    if (!(start instanceof Date) || !(end instanceof Date)) {
      throw new Error('Start and end must be Date objects');
    }

    // Validate dates are not null/undefined and are valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date objects provided');
    }

    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    startDate.value = start;
    endDate.value = end;
    currentLabel.value = 'Custom';
  };

  const updateUrl = () => {
    router.push({
      query: {
        ...route.query, // Preserve existing query parameters
        start: startDate.value.toISOString(),
        end: endDate.value.toISOString(),
      },
    });
  };

  const dateRange = computed<DateRange>(() => ({
    start: startDate.value,
    end: endDate.value,
    label: currentLabel.value,
  }));

  return {
    dateRange,
    currentLabel,
    startDate,
    endDate,
    initializeFromUrl,
    applyPreset,
    applyCustomRange,
    updateUrl,
  };
}
