import { preloadInterFont } from "./shared/fonts";
import {
  detectTimestamp,
  formatTimestamp,
  buildEpochToolsUrl,
} from "./shared/timestamp";
import { PopupUI } from "./ui/popup";

interface PopupPosition {
  x: number;
  y: number;
}

interface SelectionData {
  text: string;
  coordinates: PopupPosition;
  range?: Range;
}

declare global {
  interface Window {
    timeConverterExtensionLoaded?: boolean;
  }
}

class SelectionReader {
  private isPasswordInput(input: HTMLInputElement): boolean {
    return input.type.toLowerCase().includes("password");
  }

  readWindowSelection(): SelectionData | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const text = selection.toString();
    if (!text.trim()) {
      return null;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();
    return {
      text,
      coordinates: { x: rect.left, y: rect.top - 12 },
      range,
    };
  }

  readInputSelection(
    input: HTMLInputElement | HTMLTextAreaElement
  ): SelectionData | null {
    if (input instanceof HTMLInputElement && this.isPasswordInput(input)) {
      return null;
    }

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const text = input.value.substring(start, end);
    if (!text.trim()) {
      return null;
    }

    const rect = input.getBoundingClientRect();
    return {
      text,
      coordinates: { x: rect.left, y: rect.top - 12 },
    };
  }
}

class TimeConverterExtension {
  private readonly popup = new PopupUI();
  private readonly selectionReader = new SelectionReader();
  private readonly observedInputs = new WeakSet<
    HTMLInputElement | HTMLTextAreaElement
  >();
  private readonly cleanupCallbacks: Array<() => void> = [];
  private observer: MutationObserver | null = null;
  private lastProcessedSelection = "";

  start(): void {
    void preloadInterFont();
    this.setupSelectionChangeListener();
    this.setupInputListeners();
  }

  cleanup(): void {
    this.popup.hide();
    this.observer?.disconnect();
    this.observer = null;
    this.cleanupCallbacks.splice(0).forEach((cleanup) => {
      cleanup();
    });
  }

  private async processSelection(
    selection: SelectionData | null
  ): Promise<void> {
    if (!selection) {
      this.lastProcessedSelection = "";
      this.hidePopup();
      return;
    }

    const detected = detectTimestamp(selection.text);
    if (!detected) {
      this.hidePopup();
      return;
    }

    const formatted = formatTimestamp(detected);
    const content = {
      rows: [
        { label: "ISO 8601", value: formatted.iso8601 },
        { label: "Local time", value: formatted.fullTimezone },
      ],
      toolsUrl: buildEpochToolsUrl(detected),
    };

    if (
      !selection.range ||
      !(await this.popup.showNearSelection(
        content,
        selection.coordinates,
        selection.range
      ))
    ) {
      await this.popup.showBottomRight(content);
    }
  }

  private hidePopup(): void {
    if (!this.popup.isUserInteractingWithPopup() && this.popup.isVisible()) {
      this.popup.hide();
    }
  }

  private setupSelectionChangeListener(): void {
    const onSelectionChange = () => {
      const activeElement = document.activeElement;
      if (activeElement?.matches("input, textarea")) {
        return;
      }

      const selection = this.selectionReader.readWindowSelection();
      const text = selection?.text.trim() ?? "";
      if (text && text === this.lastProcessedSelection) {
        return;
      }

      this.lastProcessedSelection = text;
      this.processSelection(selection);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    this.cleanupCallbacks.push(() => {
      document.removeEventListener("selectionchange", onSelectionChange);
    });
  }

  private setupInputListeners(): void {
    this.addInputListeners(document.querySelectorAll("input, textarea"));

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          const element = node as Element;
          if (element.matches("input, textarea")) {
            this.addInputListeners([element]);
          }
          this.addInputListeners(element.querySelectorAll("input, textarea"));
        }
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private addInputListeners(elements: Iterable<Element>): void {
    for (const element of elements) {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        )
      ) {
        continue;
      }
      if (
        element instanceof HTMLInputElement &&
        element.type.toLowerCase().includes("password")
      ) {
        continue;
      }
      if (this.observedInputs.has(element)) {
        continue;
      }

      this.observedInputs.add(element);
      const processInputSelection = () => {
        this.lastProcessedSelection = "";
        this.processSelection(this.selectionReader.readInputSelection(element));
      };

      element.addEventListener("select", processInputSelection);
      element.addEventListener("mouseup", processInputSelection);
      this.cleanupCallbacks.push(() => {
        element.removeEventListener("select", processInputSelection);
        element.removeEventListener("mouseup", processInputSelection);
      });
    }
  }
}

if (!window.timeConverterExtensionLoaded) {
  window.timeConverterExtensionLoaded = true;

  const extension = new TimeConverterExtension();
  extension.start();

  window.addEventListener("beforeunload", () => {
    extension.cleanup();
  });
}
