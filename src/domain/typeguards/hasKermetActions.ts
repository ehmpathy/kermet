import { ElementHandle } from 'puppeteer-core';

import { WithKermetActions } from './WithKermetActions';

export const hasKermetActions = (
  element:
    | ElementHandle<HTMLInputElement | HTMLTextAreaElement>
    | WithKermetActions<ElementHandle<Element>>,
): element is WithKermetActions<ElementHandle<Element>> =>
  'hasKermetActions' in element && element.hasKermetActions === true;
