import { ElementHandle } from 'puppeteer-core';

export type KermetActionPress = (options?: {
  afterwait?: { milliseconds: number };
}) => Promise<void>;

export type KermetActionWrite = (
  words: string,
  options?: {
    /**
     * allows modification of expected values for fail fast checks
     */
    expect?: {
      /**
       * allows customization of the classes of elements that we can write on
       *
       * usecase
       * - by default, .write will fail-fast if called on an element which is not an Input or a TextArea, since its an invalid request
       * - sometimes, websites support text inputs via divs though (e.g., gads script enditor), and so we can ignore this check in those cases
       */
      element?: { class: string[] };
    };
  },
) => Promise<void>;

export type WithKermetNodeText<T extends ElementHandle> = T & {
  text: { content: string; rendered: string };
};
export type WithKermetNodeHtml<T extends ElementHandle> = T & {
  html: { inner: string; outer: string };
};

export type KermetActionFetch<T extends ElementHandle> = (
  attribute: 'text',
) => Promise<WithKermetActions<WithKermetNodeText<T>>>;

/**
 * adds actions that kermet can use to interact with the page
 */
export type WithKermetActions<T extends ElementHandle> = Omit<
  Omit<T, 'press'> & {
    /**
     * a flag to explicitly show that this element has kermet actions
     *
     * note
     * - used by 'hasKermetActions' typeguard
     */
    hasKermetActions: true;

    /**
     * presses on an element
     *
     * benefits
     * - waits for a amount of time to add human latency, supporting layout shift on laggier sites
     */
    press: KermetActionPress;

    /**
     * writes text into an input element
     *
     * benefits
     * - fails fast if element is not an input element
     * - uses copy paste under the hood, for maximum performance while maintaining human touch
     */
    write: KermetActionWrite;

    /**
     * fetches attributes about the element, for further actions support
     *
     * benefits
     * - easy way to grab commonly needed information about the node
     */
    fetch: KermetActionFetch<T>;
  },
  'click'
>;
