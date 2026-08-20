import moment from "moment-jalaali";

/**
 * Convert Jalali date string (YYYY/MM/DD) to Gregorian Date object
 * @param jalaliDate - Jalali date string in format YYYY/MM/DD
 * @returns Date object or null if invalid
 */
export function jalaliToGregorian(jalaliDate: string): Date | null {
  if (!jalaliDate || !jalaliDate.trim()) {
    return null;
  }

  try {
    // Parse Jalali date
    const jalaliMoment = moment(jalaliDate, "jYYYY/jMM/jDD");
    
    if (!jalaliMoment.isValid()) {
      return null;
    }

    // moment-jalaali internally stores dates in Gregorian format
    // We can directly use toDate() to get the Gregorian Date object
    // The toDate() method should be available since moment-jalaali extends moment
    const gregorianDate = jalaliMoment.toDate();
    
    if (isNaN(gregorianDate.getTime())) {
      return null;
    }
    
    return gregorianDate;
  } catch (error) {
    console.error("Error converting Jalali date:", error);
    // Fallback: try accessing internal date property
    try {
      const jalaliMoment = moment(jalaliDate, "jYYYY/jMM/jDD");
      // @ts-ignore - accessing internal moment property as fallback
      if (jalaliMoment._d && jalaliMoment._d instanceof Date) {
        // @ts-ignore
        return jalaliMoment._d;
      }
    } catch (fallbackError) {
      console.error("Fallback conversion also failed:", fallbackError);
    }
    return null;
  }
}

/**
 * Convert Gregorian Date object to Jalali date string (YYYY/MM/DD)
 * @param gregorianDate - Gregorian Date object
 * @returns Jalali date string in format YYYY/MM/DD or null if invalid
 */
export function gregorianToJalali(gregorianDate: Date | string): string | null {
  if (!gregorianDate) {
    return null;
  }

  try {
    const date = typeof gregorianDate === "string" ? new Date(gregorianDate) : gregorianDate;
    if (isNaN(date.getTime())) {
      return null;
    }

    const jalaliMoment = moment(date);
    return jalaliMoment.format("jYYYY/jMM/jDD");
  } catch (error) {
    console.error("Error converting Gregorian date to Jalali:", error);
    return null;
  }
}

