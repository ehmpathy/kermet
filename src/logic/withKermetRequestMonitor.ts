/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { HTTPRequest, Page } from 'puppeteer-core';
import type { LogMethods } from 'simple-leveled-log-methods';
import { Empty } from 'type-fns';
import { withTimeout } from 'wrapper-fns';

/**
 * adds the ability to monitor and wait for active requests on a page
 *
 * ref
 * - https://stackoverflow.com/questions/59771068/puppeteer-wait-for-network-requests-to-complete-after-page-select
 */
export const withKermetRequestMonitor = (page: Page) => {
  // const resourceType: ResourceType[] = [];
  const promises: Promise<unknown>[] = [];
  const pendingRequests = new Set();
  const finishedRequestsWithSuccess = new Set();
  const finishedRequestsWithErrors = new Set();

  // enable interception
  void page.setRequestInterception(true);

  // add listener for request.started
  page.on(
    'request',
    async (request: HTTPRequest & { resolver?: (value?: unknown) => void }) => {
      await request.continue().catch((error) => {
        if (!(error instanceof Error)) throw error;
        if (error.message.includes('Request is already handled!')) return;
        // log.warn( // todo: warn and prevent
        //   'request was already handled. todo, prevent duplicate .continue() attempts',
        //   {},
        // );
        throw error;
      });
      pendingRequests.add(request);
      promises.push(
        new Promise((resolve) => {
          request.resolver = resolve;
        }),
      );
    },
  );

  // add listener for request.failed
  page.on(
    'requestfailed',
    (request: HTTPRequest & { resolver?: (value?: unknown) => void }) => {
      pendingRequests.delete(request);
      finishedRequestsWithErrors.add(request);
      if (request.resolver) {
        request.resolver();
        delete request.resolver;
      }
    },
  );

  // add listener for request.finished
  page.on(
    'requestfinished',
    (request: HTTPRequest & { resolver?: (value?: unknown) => void }) => {
      pendingRequests.delete(request);
      finishedRequestsWithSuccess.add(request);
      if (request.resolver) {
        request.resolver();
        delete request.resolver;
      }
    },
  );

  // define how to wait for all requests
  const waitForAllActiveRequests = async (
    input?: Empty,
    context?: { log?: LogMethods },
  ) => {
    context?.log?.debug('waitForAllActiveRequests.input', {
      inflight: pendingRequests.size,
    });
    await withTimeout(async () => await Promise.all(promises), {
      threshold: { seconds: 30 },
    });
    context?.log?.debug('waitForAllActiveRequests.output', {
      inflight: pendingRequests.size,
    });
  };

  // define the endpoints
  return {
    waitFor: { inflight: waitForAllActiveRequests },
  };
};
