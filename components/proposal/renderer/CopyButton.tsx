"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center justify-center p-1 rounded-md hover:bg-gray-200 transition-colors focus:outline-none print:hidden text-gray-400 hover:text-gray-700"
      title="Copy to clipboard"
      type="button"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
