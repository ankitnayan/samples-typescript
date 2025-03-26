// @@@SNIPSTART typescript-hello-workflow

import { proxyActivities, WorkflowInterceptorsFactory } from '@temporalio/workflow';
import {
  OpenTelemetryInboundInterceptor,
  OpenTelemetryOutboundInterceptor,
  OpenTelemetryInternalsInterceptor,
} from '@temporalio/interceptors-opentelemetry/lib/workflow';


// Only import the activity types
import type * as activities from './activities';

import { log } from '@temporalio/workflow';



const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
/** A workflow that simply calls an activity */
export async function example(name: string): Promise<string> {

  await delay(5000);
  log.error('Before greet!');
  return await greet(name);
}

// Export the interceptors
export const interceptors: WorkflowInterceptorsFactory = () => ({
  inbound: [new OpenTelemetryInboundInterceptor()],
  outbound: [new OpenTelemetryOutboundInterceptor()],
  internals: [new OpenTelemetryInternalsInterceptor()],
});