// @@@SNIPSTART typescript-hello-worker
import { makeTelemetryFilterString, NativeConnection, Runtime, Worker } from '@temporalio/worker';
import * as activities from './activities';
import { getConnectionOptions } from './connection';
import {
  OpenTelemetryActivityInboundInterceptor,
  OpenTelemetryActivityOutboundInterceptor,
  makeWorkflowExporter,
} from '@temporalio/interceptors-opentelemetry/lib/worker';
import { otelSdk, otlpHeaders, resource, traceExporter } from './instrumentation';
import { logger } from './logger';
import { metrics } from '@opentelemetry/api';

// Get a meter instance
const meter = metrics.getMeter('order-service');

// Create a counter to track total requests
const requestCounter = meter.createCounter('requests_total', {
  description: 'Total number of requests processed',
});

// Increment the counter in your business logic
export function processRequest() {
  requestCounter.add(1, { status: 'success' }); // Add attributes if needed
}

function initializeRuntime() {
  
  Runtime.install({

    logger,

    telemetryOptions: {
      metrics: {

        otel: {
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
          headers: otlpHeaders,
          metricsExportInterval: 10000,
        },
      },

      logging: {
        forward: {},
        filter: makeTelemetryFilterString({ core: 'INFO', other: 'INFO' }),
      },
    },
  });
}

async function main() {
  initializeRuntime();
  // Step 1: Establish a connection with Temporal server.
  //
  // Worker code uses `@temporalio/worker.NativeConnection`.
  // (But in your application code it's `@temporalio/client.Connection`.)
  const connection = await NativeConnection.connect(await getConnectionOptions());
  try {
    // Step 2: Register Workflows and Activities with the Worker.
    const worker = await Worker.create({
      connection,
      namespace: process.env.NAMESPACE  || 'default',
      taskQueue: "integration",
      // Workflows are registered using a path as they run in a separate JS context.
      workflowsPath: require.resolve('./workflows'),
      activities,
      // Registers OpenTelemetry Tracing sinks and interceptors for Workflow and Activity calls
      //
      sinks: traceExporter && {
        exporter: makeWorkflowExporter(traceExporter, resource),
      },
      interceptors: traceExporter && {
        // IMPORTANT: When prebundling Workflow code (i.e. using `bundleWorkflowCode(...)`), you MUST
        //            provide the following `workflowModules` property to `bundleWorkflowCode()`;
        //            Workflow code tracing won't work if you don't.
        //
        workflowModules: [require.resolve('./workflows')],
        activity: [
          (ctx) => ({
            inbound: new OpenTelemetryActivityInboundInterceptor(ctx),
            outbound: new OpenTelemetryActivityOutboundInterceptor(ctx),
          }),
        ],
      },
    });

 
    
    // Step 3: Start accepting tasks on the `integration` queue
    //
    // The worker runs until it encounters an unexpected error or the process receives a shutdown signal registered on
    // the SDK Runtime object.
    //
    // By default, worker logs are written via the Runtime logger to STDERR at INFO level.
    //
    // See https://typescript.temporal.io/api/classes/worker.Runtime#install to customize these defaults.
    
    await worker.run();

  } finally {
    await otelSdk.shutdown();
  }
}

main().then(
  () => void process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);