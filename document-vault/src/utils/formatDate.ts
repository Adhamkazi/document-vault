export function formatDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const diff =
    Math.floor(
      (now.getTime() - date.getTime()) /
      (1000 * 60 * 60 * 24)
    );

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;

  return date.toLocaleDateString();
}


export function formatDateSimple(date?: string | null) {
  if (!date) return "Not provided";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}