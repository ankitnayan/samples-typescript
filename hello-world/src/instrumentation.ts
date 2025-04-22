// OpenTelemetry's Node.js documentation recommends to setup instrumentation from a
// dedicated file, which can be required before anything else in the application;
// e.g. by running node with `--require ./instrumentation.js`. See
// https://opentelemetry.io/docs/languages/js/getting-started/nodejs/#setup for details.

import { config } from 'dotenv';
config(); // Load environment variables before anything else

/* eslint-disable @typescript-eslint/no-unused-vars */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter as OTLPLogExporterGrpc } from '@opentelemetry/exporter-logs-otlp-grpc';
import { MetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource, detectResourcesSync } from '@opentelemetry/resources';
import { envDetector, hostDetector, osDetector, processDetector } from '@opentelemetry/resources';
import { diag } from '@opentelemetry/api';

/* eslint-enable @typescript-eslint/no-unused-vars */



// Function to parse headers from OTEL_EXPORTER_OTLP_HEADERS
function parseHeaders(headersString: string | undefined): Record<string, string> {
  if (!headersString) return {};

  const headers: Record<string, string> = {};
  const pairs = headersString.split(',');

  pairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });

  return headers;
}

// Parse headers from the environment variable
export const otlpHeaders = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);


// Function to parse OTEL_RESOURCE_ATTRIBUTES into an object
function parseResourceAttributes(attributesString: string | undefined): { [key: string]: string } {
  if (!attributesString) return {};

  const attributes: { [key: string]: string } = {};
  const pairs = attributesString.split(',');

  pairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      attributes[key] = value;
    }
  });

  return attributes;
}

// Parse resource attributes from environment variable
const resourceAttributesString = process.env.OTEL_RESOURCE_ATTRIBUTES;
const parsedAttributes = parseResourceAttributes(resourceAttributesString);

// Set service name from environment or use default
const serviceName = process.env.OTEL_SERVICE_NAME || 'default-temporal-service';
// console.log('Setting service name to:', serviceName);

// Create resource attributes with service name
const resourceAttributes = {
  'service.name': serviceName,
  ...parsedAttributes
};

// Detect resources using built-in detectors
const detectedResources = detectResourcesSync({
  detectors: [
    envDetector, 
    hostDetector, 
    osDetector,
    processDetector
  ]
});

// Filter out process.pid from the detected resources
const filteredAttributes = { ...detectedResources.attributes };
delete filteredAttributes['process.command_args'];
const filteredResources = new Resource(filteredAttributes);

// Create final resource by merging detected resources with custom attributes
export const resource = new Resource(resourceAttributes).merge(filteredResources);


function setupTraceExporter(): SpanExporter | undefined {
  return new OTLPTraceExporterGrpc({
    headers: otlpHeaders,
    timeoutMillis: 10000,
  });
}

function setupMetricReader(): MetricReader | undefined {
  return new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporterGrpc({
      headers: otlpHeaders,
      timeoutMillis: 10000,
    }),
  });
}

export const traceExporter = setupTraceExporter();
const metricReader = setupMetricReader();

export const otelSdk = new NodeSDK({
  // This is required for use with the `@temporalio/interceptors-opentelemetry` package.
  resource,

  // This is required for use with the `@temporalio/interceptors-opentelemetry` package.
  traceExporter,

  // This is optional; it enables collecting metrics about the Node process, and some other libraries.
  // Note that Temporal's Worker metrics are controlled through the Runtime options and do not relate
  // to this option.
  metricReader,

  // This is optional; it enables auto-instrumentation for certain libraries.
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  otelSdk.start();
  diag.info(`[TELEMETRY] OpenTelemetry SDK initialized successfully ...`);
} catch (error) {
  diag.error(`[TELEMETRY] Failed to initialize OpenTelemetry SDK: ${error}`);
  throw error;
}

