import { sleep } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';
import { ElementHandle, Page } from 'puppeteer-core';

import {
  KermetActionFetch,
  KermetActionPress,
  KermetActionWrite,
  WithKermetActions,
  WithKermetNodeText,
} from '../domain/typeguards/WithKermetActions';

/**
 * extends a puppeteer element with kermet actions
 *
 * benefits
 * - more reliable and soulful interactions
 * - more debuggable and maintainable operations
 */
export const withKermetActions = <T extends ElementHandle>(
  node: T,
  page: Page, // todo: assign the .page onto the .node, via KermetNode type
): WithKermetActions<T> => {
  // define how to press the node
  const press: KermetActionPress = async (options) => {
    // todo: add a check to see if the node still exists before running (could have been unmounted by now)

    // press on the node
    await node.click(); // todo: if node no longer exists, try to refind it first

    // wait for a human amount of time to pass
    const afterwait = options?.afterwait?.milliseconds ?? 500;
    await sleep(afterwait);
  };

  // define how to write into the node
  const write: KermetActionWrite = async (words, options): Promise<void> => {
    // verify that the node is an input element
    const nodeClassNamesAllowed: string[] = options?.expect?.element?.class ?? [
      'HTMLInputElement',
      'HTMLTextAreaElement',
    ];
    const nodeClassNameFound = await node.evaluate((el) => el.constructor.name);
    if (!nodeClassNamesAllowed.includes(nodeClassNameFound))
      throw new UnexpectedCodePathError(
        'can not .write on an element which is not an HTMLInputElement nor HTMLTextAreaElement',
        { words, nodeClassNamesAllowed, nodeClassNameFound },
      );

    // ensure browser has clipboard access permissions
    const client = await page.target().createCDPSession(); // https://github.com/puppeteer/puppeteer/issues/3241#issuecomment-1171770074
    await client.send('Browser.grantPermissions', {
      origin: 'https://domain.com',
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], // https://github.com/puppeteer/puppeteer/issues/3241#issuecomment-1171770074
    });

    // click on the input to ensure that the document gets focus, to avoid https://stackoverflow.com/questions/56306153/domexception-on-calling-navigator-clipboard-readtext
    await press();

    // copy the text into clipboard
    await page.evaluate(({ value }) => navigator.clipboard.writeText(value), {
      value: words,
    });

    // paste the desired code into the code input from clipboard
    await press();
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.down('Control');
    await page.keyboard.press('v');
    await page.keyboard.up('Control');
  };

  // extend the node with kermet actions
  const withKermetWithoutFetch = Object.assign(node, {
    hasKermetActions: true as const,
    press,
    write,
  });

  // define how to fetch
  const fetch: KermetActionFetch<T> = async (attribute: 'text') => {
    const [rendered, content] = await Promise.all([
      node.evaluate((thisNode) => thisNode.textContent),
      node.evaluate((thisNode) => (thisNode as HTMLElement).innerText),
    ]);
    return Object.assign(withKermetWithoutFetch, {
      fetch, // todo: test that calling fetch over and over again works
      text: { rendered, content },
    }) as WithKermetActions<WithKermetNodeText<T>>;
  };

  // build the node
  const withKermet = Object.assign(withKermetWithoutFetch, {
    fetch,
  });

  // return the node with extended actions
  return withKermet;
};
