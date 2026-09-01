import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Widget } from "../../types/settings.ts";
import { isInteractiveShortcutTarget } from "../../utils/keyboardShortcuts.ts";
import {
  clampWidgetPositionPercent,
  pixelDeltaToPercent,
  roundWidgetPositionPercent,
} from "../../utils/widgetPosition.ts";

/** Distance the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

/** Step applied by the arrow keys while a positioner has focus. */
const KEYBOARD_STEP_PERCENT = 1;

interface DragOrigin {
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
}

interface WidgetPositionerProps {
  widget: Widget;
  onMove: (id: string, position: { x: number; y: number }) => void;
  children: ReactNode;
}

/**
 * Wraps a widget card and lets it be dragged into place.
 *
 * Movement is expressed as a percentage of the viewport and applied with
 * `vw`/`vh`, so the browser recomputes the offset on resize and a layout
 * arranged on a 4K display still lands somewhere sensible on a laptop.
 */
export const WidgetPositioner = ({
  widget,
  onMove,
  children,
}: WidgetPositionerProps) => {
  const { t } = useTranslation();
  const originRef = useRef<DragOrigin | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Let buttons and links inside a card keep their own clicks.
      if (event.button !== 0 || isInteractiveShortcutTarget(event.target)) {
        return;
      }
      originRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        positionX: widget.position.x,
        positionY: widget.position.y,
      };
      hasMovedRef.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [widget.position.x, widget.position.y],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = originRef.current;
      // Null whenever the pointer moves without a preceding press.
      // biome-ignore lint/suspicious/noUnnecessaryConditions: Biome does not track writes through ref.current across callbacks, so it reads this as always set.
      if (!origin) {
        return;
      }

      const deltaX = event.clientX - origin.pointerX;
      const deltaY = event.clientY - origin.pointerY;

      if (
        // biome-ignore lint/suspicious/noUnnecessaryConditions: same ref-tracking limitation; hasMovedRef is set below and read on the next pointer event.
        !hasMovedRef.current &&
        Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      hasMovedRef.current = true;
      setIsDragging(true);

      onMove(widget.id, {
        x: clampWidgetPositionPercent(
          roundWidgetPositionPercent(
            origin.positionX + pixelDeltaToPercent(deltaX, innerWidth),
          ),
        ),
        y: clampWidgetPositionPercent(
          roundWidgetPositionPercent(
            origin.positionY + pixelDeltaToPercent(deltaY, innerHeight),
          ),
        ),
      });
    },
    [onMove, widget.id],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    originRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-KEYBOARD_STEP_PERCENT, 0],
        ArrowRight: [KEYBOARD_STEP_PERCENT, 0],
        ArrowUp: [0, -KEYBOARD_STEP_PERCENT],
        ArrowDown: [0, KEYBOARD_STEP_PERCENT],
      };
      const step = steps[event.key];
      if (!step) {
        return;
      }
      // Claim the arrow keys so wallpaper history navigation does not also
      // fire while a widget has focus.
      event.preventDefault();
      event.stopPropagation();
      const [stepX, stepY] = step;
      onMove(widget.id, {
        x: clampWidgetPositionPercent(
          roundWidgetPositionPercent(widget.position.x + stepX),
        ),
        y: clampWidgetPositionPercent(
          roundWidgetPositionPercent(widget.position.y + stepY),
        ),
      });
    },
    [onMove, widget.id, widget.position.x, widget.position.y],
  );

  return (
    // A free drag surface has no semantic element to be. The rule's concern is
    // met below: the region is labelled, focusable and fully operable from the
    // keyboard, so the tab stop is what makes that path reachable at all.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: explained above.
    <div
      className={`widget-card-positioner${isDragging ? " dragging" : ""}`}
      style={{
        transform: `translate(${widget.position.x}vw, ${widget.position.y}vh)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      // A movable object in a canvas-like surface, focusable so the same
      // reposition is available without a pointer.
      role="application"
      aria-label={t("widgets.reposition", {
        widget: t(`settings.widgets.${widget.type}`),
      })}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the tab stop is what makes the keyboard reposition path reachable; see the note above.
      tabIndex={0}
    >
      {children}
    </div>
  );
};
