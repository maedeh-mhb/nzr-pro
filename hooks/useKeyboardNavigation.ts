import { useEffect, useRef } from "react";

interface UseKeyboardNavigationOptions {
  onEnter?: (e: KeyboardEvent) => void;
  onEscape?: (e: KeyboardEvent) => void;
  onTab?: (e: KeyboardEvent) => void;
  enabled?: boolean;
  target?: HTMLElement | null;
}

export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onTab,
  enabled = true,
  target,
}: UseKeyboardNavigationOptions) {
  const targetRef = useRef<HTMLElement | null>(target || null);

  useEffect(() => {
    if (!enabled) return;

    const element = targetRef.current || document;
    const handleKeyDown = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      switch (keyEvent.key) {
        case "Enter":
          if (onEnter && !keyEvent.shiftKey && !keyEvent.ctrlKey && !keyEvent.metaKey) {
            // Don't trigger on Enter in textareas unless Ctrl/Cmd is pressed
            const target = keyEvent.target as HTMLElement;
            if (target.tagName !== "TEXTAREA" || keyEvent.ctrlKey || keyEvent.metaKey) {
              onEnter(keyEvent);
            }
          }
          break;
        case "Escape":
          if (onEscape) {
            onEscape(keyEvent);
          }
          break;
        case "Tab":
          if (onTab) {
            onTab(keyEvent);
          }
          break;
      }
    };

    element.addEventListener("keydown", handleKeyDown);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onEnter, onEscape, onTab]);

  return { targetRef };
}

