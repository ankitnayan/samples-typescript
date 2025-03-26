// @@@SNIPSTART typescript-hello-worker
import { DefaultLogger, makeTelemetryFilterString, NativeConnection, Runtime, Worker } from '@temporalio/worker';
import * as activities from './activities';
import { getConnectionOptions } from './connection';
import {
  OpenTelemetryActivityInboundInterceptor,
  OpenTelemetryActivityOutboundInterceptor,
  makeWorkflowExporter,
} from '@temporalio/interceptors-opentelemetry/lib/worker';
import { otelSdk, resource, traceExporter } from './instrumentation';
import { MetricReader } from '@opentelemetry/sdk-metrics';


function initializeRuntime() {
  Runtime.install({
    // Configure a logger that will collect all log messages emitted by the Worker,
    // including those emitted through the Workflow's and Activity's context logger APIs.
    // See the 'custom-logger' sample for an example of how to build a logger that
    // processes log messages using a third party logging library.
    //
    // IMPORTANT: Make sure to configure the `telemetryOptions.logging` property
    //            below to also collect logs emitted by the native runtime.
    //
    logger: new DefaultLogger('WARN'),

    telemetryOptions: {
      // Configure the OpenTelemetry metrics exporter for the native runtime.
      //
      // IMPORTANT: Uncomment either of the two options below to choose the desired exporter,
      //            as appropriate for your environment.
      //

      // (1) A metric exporter that periodically sends metrics to a server using the
      //     _OTLP over gRPC_ protocol. This is the most common configuration when connecting
      //     to a metrics collector. Note that the _OTLP over HTTP_ protocol (i.e. port 4318)
      //     is not supported for Runtime's metrics.
      //
      metrics: {
        prometheus: {
          bindAddress: '0.0.0.0:9091',
        },
        // otel: {
        //   url: 'https://ingest.us.staging.signoz.cloud:443',
        //   headers: {
        //     'signoz-access-token': '4uOfUFbIsC8jcuTWtF27sTMbJZ4QWC4y5tSB',
        //   },
        //   metricsExportInterval: 10000,
        // },
      },

      // (2) A metrics exporter that exposes metrics as an HTTP endpoint that can be queried
      //     by your collector. Just point a browser on http://127.0.0.1:9091/metrics to
      //     visualize your Worker's metrics.
      //
      // metrics: {
      //   prometheus: {
      //     // Depending on you execution environment, you might need to set the host to `0.0.0.0` instead;
      //     // beware however that doing so in environments where this is not needed might expose your
      //     // metrics to the public Internet. This is why we default to the safer value of `127.0.0.1`.
      //     bindAddress: '127.0.0.1:9091',
      //   },
      // },

      // Configure forwarding of log entries emitted by the native runtime through the TypeScript
      // logger (i.e. the one configured using the `logger` property above). This is required for
      // example if you would like to forward all worker logs to a log aggregation service.
      //
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