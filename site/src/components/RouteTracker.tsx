import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/tracking";

const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackEvent("page_view", {
      path: `${location.pathname}${location.search}`,
      title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
};

export default RouteTracker;
