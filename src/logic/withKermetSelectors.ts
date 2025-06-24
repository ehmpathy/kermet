import { toMilliseconds, UniDuration } from '@ehmpathy/uni-time';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { ElementHandle, Page } from 'puppeteer-core';
import type { LogMethods } from 'simple-leveled-log-methods';

import { WithKermetActions } from '../domain/typeguards/WithKermetActions';
import {
  KermetWaitForAll,
  KermetWaitForOne,
  WithKermetSelectors,
} from '../domain/typeguards/WithKermetSelectors';
import { withKermetActions } from './withKermetActions';

export class KermetWaitTimeoutError extends HelpfulError {
  constructor({
    selector,
    timeout,
    debug,
  }: {
    selector: string;
    timeout: UniDuration;
    debug?: Record<string, any>;
  }) {
    super(
      `kermet could not find the${
        debug?.name ? ` '${debug.name}'` : ''
      } element with selector '${selector}' within the timeout of ${Object.entries(
        timeout,
      )
        .flat()
        .join('=')}`,
      { selector, timeout, debug },
    );
  }
}

const DEFAULT_TIMEOUT: UniDuration = { seconds: 30 };

export const withKermetSelectors = <
  T extends Page,
  // todo: support elements by implementing our own "wait for selector"
>(
  page: T,
  context?: { log?: LogMethods },
): WithKermetSelectors<T> => {
  // define the wait for one selector for this element
  const waitForOne: KermetWaitForOne = async <E extends ElementHandle>(
    selector: Parameters<KermetWaitForOne>[0],
    options: Parameters<KermetWaitForOne>[1],
  ): Promise<WithKermetActions<E>> => {
    try {
      const element: ElementHandle<Element> | null = await page.waitForSelector(
        selector,
        {
          timeout: toMilliseconds(options?.timeout ?? DEFAULT_TIMEOUT),
        },
      );
      if (!element)
        throw new UnexpectedCodePathError(
          'this should never occur. should have timed out',
        );
      return withKermetActions<E>(element as E, page);
    } catch (error: any) {
      // if optional, then return null
      if (options?.required === false) return null as any; // todo: update the types to show that this is actually optional when required is false

      // take a photo of the page during the error and log it to aid in debugging
      // const screenshotUrl = await takeScreenshotOfPage({ page }); // todo: show screenshot as part of error; allow upload api to be defined in context?
      context?.log?.warn('waitForSelector resulted in an error', { selector });

      // and continue passing the error up
      throw new KermetWaitTimeoutError({
        selector,
        timeout: options?.timeout ?? DEFAULT_TIMEOUT,
        debug: options?.debug,
      });
    }
  };

  // define the wait for all selector for this element
  const waitForAll: KermetWaitForAll = async <E extends ElementHandle>(
    selector: Parameters<KermetWaitForOne>[0],
    options: Parameters<KermetWaitForOne>[1],
  ): Promise<WithKermetActions<E>[]> => {
    // wait for atleast one to appear
    await waitForOne(selector, options);

    // then return all of them
    const elements = await page.$$(selector);
    return elements.map((node) =>
      withKermetActions(node, page),
    ) as WithKermetActions<E>[];
  };

  // extend the node with kermet selectors
  const withKermet = Object.assign(page, {
    waitForOne,
    waitForAll,
  }) as WithKermetSelectors<T>;

  // return the node with extended selectors
  return withKermet;
};
