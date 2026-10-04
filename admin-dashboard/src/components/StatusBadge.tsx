import React from "react";

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const styles: Record<string, string> = {
    pending:
      "bg-warning/10 text-warning",

    accepted:
      "bg-accent text-primary",

    out_for_delivery:
      "bg-accent text-primary",

    delivered:
      "bg-success/10 text-success",

    cancelled:
      "bg-danger/10 text-danger",
  };

  return (
    <span
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
        styles[status] || "bg-surface text-text-secondary"
      }`}
    >
      {status.replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())}
    </span>
  );
};
