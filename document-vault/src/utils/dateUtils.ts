export function getExpiryStatus(expiryDate: string) {
  const today = new Date();

  // Ignore time
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffInDays = Math.floor(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffInDays < 0) {
    const days = Math.abs(diffInDays);

    return {
      label:
        days === 1
          ? "Expired Yesterday"
          : `Expired ${days} days ago`,
      color: "#DC2626",
    };
  }

  if (diffInDays === 0) {
    return {
      label: "Expires Today",
      color: "#EA580C",
    };
  }

  if (diffInDays === 1) {
    return {
      label: "Expires Tomorrow",
      color: "#D97706",
    };
  }

  return {
    label: `Expires in ${diffInDays} days`,
    color: "#CA8A04",
    backgroundColor: "#FEF3C7",
  };
}