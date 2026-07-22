import React from "react";

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-700",

    accepted:
      "bg-blue-100 text-blue-700",

    out_for_delivery:
      "bg-cyan-100 text-cyan-700",

    delivered:
      "bg-green-100 text-green-700",

    cancelled:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status.replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())}
    </span>
  );
};