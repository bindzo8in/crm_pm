"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface TariffClientGreetingProps {
  defaultText?: string;
}

export function TariffClientGreeting({ defaultText = "Your Business" }: TariffClientGreetingProps) {
  const [clientName, setClientName] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check URL first
    const clientFromUrl = searchParams.get("client");
    
    if (clientFromUrl) {
      setClientName(clientFromUrl);
      try {
        localStorage.setItem("tariff_client_name", clientFromUrl);
      } catch (e) {
        // Ignore local storage errors (e.g. incognito mode)
      }
    } else {
      // Fallback to local storage
      try {
        const storedClient = localStorage.getItem("tariff_client_name");
        if (storedClient) {
          setClientName(storedClient);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [searchParams]);

  return (
    <span className="text-primary">
      {clientName ? clientName : defaultText}
    </span>
  );
}
