import { useState, useEffect } from 'react';

/**
 * Hook to track whether content has been generated for a feature
 * Persists state to localStorage for better UX
 */
export function useContentState(featureName: string, hasContent: boolean) {
  const [hasGeneratedContent, setHasGeneratedContent] = useState(() => {
    const stored = localStorage.getItem(`${featureName}_has_content`);
    return stored === 'true' || hasContent;
  });

  // Update localStorage when hasContent changes to true
  useEffect(() => {
    if (hasContent && !hasGeneratedContent) {
      setHasGeneratedContent(true);
      localStorage.setItem(`${featureName}_has_content`, 'true');
    }
  }, [hasContent, hasGeneratedContent, featureName]);

  // Function to manually reset the state (useful for clearing/resetting)
  const resetContentState = () => {
    setHasGeneratedContent(false);
    localStorage.removeItem(`${featureName}_has_content`);
  };

  // Function to manually set content state
  const setContentState = (hasContent: boolean) => {
    setHasGeneratedContent(hasContent);
    localStorage.setItem(`${featureName}_has_content`, String(hasContent));
  };

  return {
    hasGeneratedContent,
    resetContentState,
    setContentState,
  };
}

/**
 * Hook to determine if right panel should be rendered
 * Takes into account both desktop (always show) and mobile (only when content exists)
 */
export function useShouldShowRightPanel(hasGeneratedContent: boolean) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      // On desktop (md and above), always show if content exists
      // On mobile, only show if content exists
      const isDesktop = window.innerWidth >= 768; // md breakpoint
      setShouldShow(isDesktop || hasGeneratedContent);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [hasGeneratedContent]);

  return shouldShow;
}