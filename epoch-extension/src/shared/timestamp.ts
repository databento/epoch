import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export type TimestampPrecision =
  | "seconds"
  | "milliseconds"
  | "microseconds"
  | "nanoseconds";

export interface DetectedTimestamp {
  text: string;
  value: bigint;
  precision: TimestampPrecision;
}

export interface FormattedTimestamp {
  iso8601: string;
  fullTimezone: string;
}

export function detectTimestamp(value: string): DetectedTimestamp | null {
  const text = value.trim();
  const precision = detectPrecision(text);
  if (!precision) {
    return null;
  }

  return { text, value: BigInt(text), precision };
}

function detectPrecision(text: string): TimestampPrecision | null {
  if (/^[1-9]\d{9}$/.test(text)) {
    return "seconds";
  }
  if (/^[1-9]\d{12}$/.test(text)) {
    return "milliseconds";
  }
  if (/^[1-9]\d{15}$/.test(text)) {
    return "microseconds";
  }
  if (/^[1-9]\d{18}$/.test(text)) {
    return "nanoseconds";
  }
  return null;
}

function toMilliseconds(value: bigint, precision: TimestampPrecision): bigint {
  switch (precision) {
    case "seconds":
      return value * 1_000n;
    case "milliseconds":
      return value;
    case "microseconds":
      return value / 1_000n;
    case "nanoseconds":
      return value / 1_000_000n;
  }
}

function subMillisecondDigits(
  value: bigint,
  precision: TimestampPrecision
): string {
  switch (precision) {
    case "seconds":
    case "milliseconds":
      return "";
    case "microseconds":
      return (value % 1_000n).toString().padStart(3, "0");
    case "nanoseconds":
      return (value % 1_000_000n).toString().padStart(6, "0");
  }
}

export function formatTimestamp(
  timestamp: DetectedTimestamp
): FormattedTimestamp {
  const milliseconds = Number(
    toMilliseconds(timestamp.value, timestamp.precision)
  );
  const extraDigits = subMillisecondDigits(
    timestamp.value,
    timestamp.precision
  );
  const dateTime = dayjs(milliseconds);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const msDigits = String(milliseconds % 1000).padStart(3, "0");
  const iso8601 = `${dateTime.utc().format("YYYY-MM-DDTHH:mm:ss")}.${msDigits}${extraDigits}Z`;

  const local = dateTime.tz(timeZone);
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date(milliseconds))
    .find((part) => part.type === "timeZoneName")?.value;

  const offsetText = formatUtcOffset(timeZone, milliseconds);

  return {
    iso8601,
    fullTimezone: `${local.format("ddd")} ${local.format("MMM")} ${local.format(
      "D"
    )} ${local.format("YYYY")} ${local.format("h:mm:ss A")} ${zoneName} (${offsetText})`,
  };
}

function formatUtcOffset(timeZone: string, milliseconds: number): string {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(milliseconds))
    .find((part) => part.type === "timeZoneName")?.value;

  if (offsetName === "GMT" || offsetName === "UTC") {
    return "UTC+0:00";
  }

  const match = offsetName?.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (match) {
    const [, sign, hours, minutes = "00"] = match;
    return `UTC${sign}${Number(hours)}:${minutes.padStart(2, "0")}`;
  }

  const z = dayjs(milliseconds).tz(timeZone).format("Z");
  const zMatch = z.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (zMatch) {
    return `UTC${zMatch[1]}${Number(zMatch[2])}:${zMatch[3]}`;
  }

  return "UTC+0:00";
}

export function formatDetectedTimestamp(
  value: string
): FormattedTimestamp | null {
  const timestamp = detectTimestamp(value);
  return timestamp ? formatTimestamp(timestamp) : null;
}

export function buildEpochToolsUrl(timestamp: DetectedTimestamp): string {
  return `https://epoch.to/${encodeURIComponent(timestamp.text)}`;
}
