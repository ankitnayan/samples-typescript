import winston, { transports } from 'winston';
import type { Logger as TemporalLogger } from '@temporalio/common/lib/logger';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter, LoggerProvider, LogRecord } from '@opentelemetry/sdk-logs';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { Resource } from '@opentelemetry/resources';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { LogLevel, LogMetadata, Logger } from '@temporalio/common';


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
        'signoz-ingestion-key': 'b7918a50-a0a2-4152-a196-91abdc3c4a40',
    },
})

// Add processor with the OTLP exporter
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(otlpExporter))
// loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(otlpExporter))
logs.setGlobalLoggerProvider(loggerProvider);


const otlp_logger = loggerProvider.getLogger('default', '1.0.0');


const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new transports.Console(),
        new OpenTelemetryTransportV3(),
    ],
});


export const logger: Logger = {
    trace: (...args) => winstonLogger.debug(...args),
    debug: (...args) => winstonLogger.debug(...args),
    info: (...args) => winstonLogger.info(...args),
    warn: (...args) => winstonLogger.warn(...args),
    error: (...args) => winstonLogger.error(...args),
    log: (level, message, ...args) => {

        otlp_logger.emit({
            // severityNumber: 16,
            severityText: level,
            body: message,
            // attributes: args[0] || {},
            attributes: Object.assign({}, ...args),
        });
        // console.log(`Message: ${message}, Level: ${level}, Attributes: ${JSON.stringify(Object.assign({}, ...args))}`);
        return (winstonLogger as any)[level]?.(...args) || winstonLogger.info(...args)
    }
};
  


