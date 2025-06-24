import { UniDuration } from '@ehmpathy/uni-time';
import { ElementHandle, Page } from 'puppeteer-core';

import { WithKermetActions } from './WithKermetActions';

export type KermetWaitForOne = <E extends ElementHandle>(
  selector: string,
  options?: {
    /**
     * whether you want to require this to occur - or just detect if it occurs
     *
     * default = true
     */
    required?: boolean;

    /**
     * whether you want to wait for the element to appear or vanish
     *
     * default = 'APPEAR'
     */
    to?: 'APPEAR' | 'VANISH';

    /**
     * how long to wait
     *
     * default = 30sec
     */
    timeout?: UniDuration;

    /**
     * debug data to include in any error messages which may occur
     */
    debug?: {
      name: string;
      scope?: string;
    };
  },
) => Promise<WithKermetActions<E>>;

export type KermetWaitForAll = <E extends ElementHandle>(
  ...args: Parameters<KermetWaitForOne>
) => Promise<WithKermetActions<E>[]>;

/**
 * adds selectors that kermet can use to find elements on the page
 *
 * note
 * - may be a page
 * - may be an element
 *
 * features
 * - pit-of-success defaults
 * - intuitive, readable names
 */
export type WithKermetSelectors<T extends Omit<Page | ElementHandle, 'click'>> =
  Omit<
    T & {
      /**
       * waits for one element for the selector to appear on the page and returns it
       *
       * note
       * - e.g., document.querySelector
       */
      waitForOne: KermetWaitForOne;

      /**
       * waits for at least one element for the selector to appear on the page and returns all that match it at that time
       *
       * note
       * - e.g., document.querySelectorAll
       */
      waitForAll: KermetWaitForAll;
    },
    'waitForSelector'
  >;
