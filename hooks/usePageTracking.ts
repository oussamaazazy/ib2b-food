import { useEffect } from "react";
import { trackEvent } from "../services/trackEvent";

export const usePageTracking = () => {
  useEffect(() => {
    const handlePageView = () => {
      trackEvent({
        event: "page_view",
        page: window.location.pathname,
      });
    };

    handlePageView();

    window.addEventListener("popstate", handlePageView);

    return () => {
      window.removeEventListener("popstate", handlePageView);
    };
  }, []);
};
