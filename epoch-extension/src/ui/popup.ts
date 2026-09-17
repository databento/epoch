import {
  POPUP_CLOSE_BUTTON_PADDING,
  POPUP_EDGE_MARGIN,
  POPUP_HOVER_DELAY,
  POPUP_POSITION_OFFSET,
  USER_INTERACTION_DELAY,
} from "../shared/constants";
import { FONT_FAMILY, preloadInterFont } from "../shared/fonts";

const POPUP_ID = "epoch-floating-popup";

interface PopupPosition {
  x: number;
  y: number;
}

interface PopupRow {
  label: string;
  value: string;
}

interface PopupContent {
  rows: PopupRow[];
  toolsUrl: string;
}

interface Palette {
  surface: string;
  border: string;
  label: string;
  value: string;
  link: string;
  linkHover: string;
  closeBackground: string;
  closeBorder: string;
  closeColor: string;
  shadow: string;
}

const LIGHT_PALETTE: Palette = {
  surface: "#ffffff",
  border: "1px solid #e8ebfb",
  label: "#8d8ebc",
  value: "#323348",
  link: "#6266e5",
  linkHover: "#6165f0",
  closeBackground: "#ffffff",
  closeBorder: "1px solid #e8ebfb",
  closeColor: "#323348",
  shadow:
    "0 3px 15px rgba(58, 57, 76, 0.13), 0 15px 35px rgba(86, 85, 113, 0.1)",
};

const DARK_PALETTE: Palette = {
  surface: "#323348",
  border: "none",
  label: "#8d8ebc",
  value: "#fdfdff",
  link: "#898df1",
  linkHover: "#a5b4fc",
  closeBackground: "#464774",
  closeBorder: "none",
  closeColor: "#fdfdff",
  shadow:
    "0 3px 15px rgba(98, 102, 229, 0.13), 0 15px 35px rgba(98, 102, 229, 0.1)",
};

export class PopupUI {
  private popup: HTMLElement | null = null;
  private scrollListener: (() => void) | null = null;
  private isUserInteracting = false;

  async showNearSelection(
    content: PopupContent,
    position: PopupPosition,
    range: Range
  ): Promise<boolean> {
    this.hide();
    await preloadInterFont();
    this.popup = this.createPopupElement(content);
    document.body.appendChild(this.popup);

    if (!this.positionNearSelection(position, range)) {
      this.hide();
      return false;
    }

    this.setupScrollListener();
    return true;
  }

  async showBottomRight(content: PopupContent): Promise<void> {
    this.hide();
    await preloadInterFont();
    this.popup = this.createPopupElement(content);
    document.body.appendChild(this.popup);
    this.positionBottomRight();
    this.setupScrollListener();
  }

  hide(): void {
    this.popup?.remove();
    this.popup = null;
    this.removeScrollListener();
    this.isUserInteracting = false;
  }

  isVisible(): boolean {
    return this.popup !== null && document.body.contains(this.popup);
  }

  isUserInteractingWithPopup(): boolean {
    return this.isUserInteracting;
  }

  private createPopupElement(content: PopupContent): HTMLElement {
    const palette = this.isDarkTheme() ? DARK_PALETTE : LIGHT_PALETTE;
    const popup = document.createElement("div");
    popup.id = POPUP_ID;
    popup.style.cssText = this.getPopupStyles(palette);

    content.rows.forEach((row) => {
      popup.appendChild(this.createRowElement(row, palette));
    });

    // Inter's latin subset has no U+2192, so the arrow is drawn inline to keep
    // it in the same weight and baseline as the label.
    const linkButton = document.createElement("div");
    linkButton.className = "popup-link";
    linkButton.innerHTML = `
      <span>More formats</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 6H10M6.5 2.5L10 6L6.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    linkButton.style.cssText = this.getLinkStyles(palette);
    linkButton.addEventListener("click", (event) => {
      event.stopPropagation();
      window.open(content.toolsUrl, "_blank", "noopener");
    });
    linkButton.addEventListener("mouseenter", () => {
      linkButton.style.color = palette.linkHover;
    });
    linkButton.addEventListener("mouseleave", () => {
      linkButton.style.color = palette.link;
    });

    const closeButton = document.createElement("div");
    closeButton.className = "popup-close";
    closeButton.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    closeButton.style.cssText = this.getCloseButtonStyles(palette);
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.hide();
    });

    popup.addEventListener("mouseenter", () => {
      closeButton.style.opacity = "1";
      this.isUserInteracting = true;
    });
    popup.addEventListener("mouseleave", () => {
      closeButton.style.opacity = "0";
      setTimeout(() => {
        this.isUserInteracting = false;
      }, POPUP_HOVER_DELAY);
    });
    popup.addEventListener("mousedown", () => {
      this.isUserInteracting = true;
    });
    popup.addEventListener("mouseup", () => {
      setTimeout(() => {
        this.isUserInteracting = false;
      }, USER_INTERACTION_DELAY);
    });
    popup.addEventListener("click", (event) => {
      event.stopPropagation();
      this.isUserInteracting = true;
    });

    popup.appendChild(linkButton);
    popup.appendChild(closeButton);

    return popup;
  }

  private createRowElement(row: PopupRow, palette: Palette): HTMLElement {
    const rowElement = document.createElement("div");
    rowElement.className = "popup-row";
    rowElement.style.cssText = this.getRowStyles();

    const label = document.createElement("div");
    label.className = "popup-row-label";
    label.textContent = row.label;
    label.style.cssText = this.getRowLabelStyles(palette);

    const value = document.createElement("div");
    value.className = "popup-row-value";
    value.textContent = row.value;
    value.style.cssText = this.getRowValueStyles(palette);

    rowElement.appendChild(label);
    rowElement.appendChild(value);
    return rowElement;
  }

  private positionNearSelection(
    position: PopupPosition,
    range: Range
  ): boolean {
    if (!this.popup) {
      return false;
    }

    this.popup.style.top = "0px";
    this.popup.style.left = "0px";
    this.popup.style.visibility = "hidden";

    const popupRect = this.popup.getBoundingClientRect();
    const selectionRect = range.getBoundingClientRect();
    if (selectionRect.width <= 0 || selectionRect.height <= 1) {
      return false;
    }

    const spaceAbove = selectionRect.top;
    const spaceBelow = window.innerHeight - selectionRect.bottom;
    const popupHeight = popupRect.height;
    let finalX = selectionRect.left || position.x;
    let finalY: number;

    if (
      spaceAbove >=
      popupHeight + POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING
    ) {
      finalY = selectionRect.top - popupHeight - POPUP_POSITION_OFFSET;
    } else if (spaceBelow >= popupHeight + POPUP_EDGE_MARGIN) {
      finalY = selectionRect.bottom + POPUP_POSITION_OFFSET;
    } else {
      finalY =
        spaceAbove >= spaceBelow
          ? POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING
          : window.innerHeight - popupHeight - POPUP_EDGE_MARGIN;
    }

    if (
      finalX + popupRect.width + POPUP_CLOSE_BUTTON_PADDING >
      window.innerWidth - POPUP_EDGE_MARGIN
    ) {
      finalX =
        window.innerWidth -
        popupRect.width -
        POPUP_CLOSE_BUTTON_PADDING -
        POPUP_EDGE_MARGIN;
    }
    if (finalX < POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING) {
      finalX = POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING;
    }

    this.popup.style.top = `${finalY + window.scrollY}px`;
    this.popup.style.left = `${finalX + window.scrollX}px`;
    this.popup.style.visibility = "visible";
    return true;
  }

  private positionBottomRight(): void {
    if (!this.popup) {
      return;
    }

    this.popup.style.position = "fixed";
    this.popup.style.bottom = `${POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING}px`;
    this.popup.style.right = `${POPUP_EDGE_MARGIN + POPUP_CLOSE_BUTTON_PADDING}px`;
    this.popup.style.top = "auto";
    this.popup.style.left = "auto";
    this.popup.style.visibility = "visible";
  }

  private setupScrollListener(): void {
    this.removeScrollListener();
    this.scrollListener = () => {
      this.hide();
    };

    window.addEventListener("scroll", this.scrollListener, { passive: true });
    document.addEventListener("scroll", this.scrollListener, {
      capture: true,
      passive: true,
    });
  }

  private removeScrollListener(): void {
    if (!this.scrollListener) {
      return;
    }

    window.removeEventListener("scroll", this.scrollListener);
    document.removeEventListener("scroll", this.scrollListener, {
      capture: true,
    });
    this.scrollListener = null;
  }

  private isDarkTheme(): boolean {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  private getPopupStyles(palette: Palette): string {
    return `
      position: absolute !important;
      z-index: 2147483647 !important;
      box-sizing: border-box;
      display: flex !important;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 16px 20px;
      background: ${palette.surface};
      border: ${palette.border};
      border-radius: 8px;
      box-shadow: ${palette.shadow};
      pointer-events: auto;
      transition: opacity 0.2s ease;
      visibility: visible !important;
      font-family: ${FONT_FAMILY};
      width: max-content;
      max-width: 600px;
      overflow: visible;
      cursor: text;
      user-select: text;
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  private getRowStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      width: 100%;
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  private getRowLabelStyles(palette: Palette): string {
    return `
      font-family: ${FONT_FAMILY};
      font-size: 12px;
      font-weight: 500;
      line-height: 17px;
      color: ${palette.label};
      white-space: nowrap;
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  private getRowValueStyles(palette: Palette): string {
    return `
      font-family: ${FONT_FAMILY};
      font-size: 16px;
      font-weight: 500;
      line-height: 25px;
      color: ${palette.value};
      word-break: break-word;
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  private getLinkStyles(palette: Palette): string {
    return `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: ${FONT_FAMILY};
      font-size: 12px;
      font-weight: 600;
      line-height: 25px;
      color: ${palette.link};
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.2s ease;
      user-select: none;
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  private getCloseButtonStyles(palette: Palette): string {
    return `
      position: absolute !important;
      top: -11px;
      right: -11px;
      width: 22px;
      height: 22px;
      background: ${palette.closeBackground};
      color: ${palette.closeColor};
      border: ${palette.closeBorder};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    `
      .replace(/\s+/g, " ")
      .trim();
  }
}
