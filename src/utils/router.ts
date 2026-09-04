import { useState, useEffect, useCallback } from 'react';

export interface RouteState {
  path: string;
  projectId?: string;
}

function parseCurrentLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { path: '/' };
  }

  // Support both standard pathname and hash routing for maximum environment compatibility
  let currentPath = window.location.pathname;
  if (window.location.hash.startsWith('#/')) {
    currentPath = window.location.hash.substring(1);
  }

  if (currentPath.startsWith('/editor/')) {
    const projectId = currentPath.replace('/editor/', '').split('/')[0];
    return { path: `/editor/${projectId}`, projectId };
  }

  if (currentPath.startsWith('/projects')) {
    return { path: '/projects' };
  }

  return { path: '/' };
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(parseCurrentLocation());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentLocation());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = useCallback((targetPath: string) => {
    if (typeof window === 'undefined') return;

    // Use HTML5 pushState
    try {
      window.history.pushState({}, '', targetPath);
    } catch {
      window.location.hash = `#${targetPath}`;
    }

    setRoute(parseCurrentLocation());
  }, []);

  return {
    route,
    path: route.path,
    projectId: route.projectId,
    navigate,
    push: navigate,
  };
}
