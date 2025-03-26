import winston, { transports } from 'winston';
import type { Logger as TemporalLogger } from '@temporalio/common/lib/logger';

import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { logs } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { Resource } from '@opentelemetry/resources';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';


// Initialize the Logger provider
const loggerProvider = new LoggerProvider({
    resource: new Resource({
      'service.name': 'winston-logger',
      'service.version': '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
    }),
  })


// Configure OTLP exporter for SigNoz
const otlpExporter = new OTLPLogExporter({
    url: 'https://ingest.in.signoz.cloud:443/v1/logs',
    headers: {
        'signoz-ingestion-key': 'vgqqxiEGfRGdVZYXzvi2c7-6e31kDV6HoFxZ',
    },
})


// Add processor with the OTLP exporter
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(otlpExporter))

// Set the global logger provider
logs.setGlobalLoggerProvider(loggerProvider)

const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new transports.Console({
            format: winston.format.json(),
        }),
        new OpenTelemetryTransportV3(),
    ],
});

export const logger: TemporalLogger = {
    trace: (message: any, ...args: any[]) => winstonLogger.debug(message, ...args),
    debug: (message: any, ...args: any[]) => winstonLogger.debug(message, ...args),
    info: (message: any, ...args: any[]) => winstonLogger.info(message, ...args),
    warn: (message: any, ...args: any[]) => winstonLogger.warn(message, ...args),
    error: (message: any, ...args: any[]) => winstonLogger.error(message, ...args),
    log: (level: string, message: any, ...args: any[]) => {
        const logFn = (winstonLogger as any)[level] || winstonLogger.info;
        return logFn(message, ...args);
    }
};
  