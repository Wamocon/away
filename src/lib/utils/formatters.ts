import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Renders any field value from vacation template fields into a human-readable string or ReactNode.
 * Handles strings, numbers, booleans, and complex checkbox arrays.
 */
export function renderFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    // Handle Checkbox/Multi-select objects (array of {id, label, checked})
    const activeLabels = value
      .filter(item => item && typeof item === 'object' && 'checked' in item && item.checked)
      .map(item => String(item.label || ''));
    return activeLabels.length > 0 ? activeLabels.join(', ') : null;
  } 
  
  if (typeof value === 'object' && value !== null && 'label' in (value as Record<string, unknown>)) {
    // Handle single-select objects {label, value}
    return String((value as Record<string, unknown>).label);
  } 
  
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein';
  } 
  
  const strValue = String(value);
  
  // Attempt to format as date if it looks like an ISO date string
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3}Z)?)?$/)) {
    try {
      return format(parseISO(value), 'dd.MM.yyyy', { locale: de });
    } catch (e) {
      return strValue; // Fallback if date parsing fails
    }
  }

  return strValue === 'null' || strValue === 'undefined' ? null : strValue;
}
