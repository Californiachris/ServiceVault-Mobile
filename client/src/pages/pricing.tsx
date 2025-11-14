import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PricingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to landing page - pricing is now handled via role-specific pages
    setLocation("/");
  }, [setLocation]);

  return null;
}
