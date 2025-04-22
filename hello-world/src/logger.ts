import winston, { transports } from 'winston';
import { OTLPLogExporter as OTLPLogExporterGrpc } from '@opentelemetry/exporter-logs-otlp-grpc';
import { logs } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Logger } from '@temporalio/common';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';    
import { otlpHeaders, resource } from './instrumentation';

// Initialize the Logger provider
const loggerProvider = new LoggerProvider({
    resource,
  })


// Configure OTLP exporter for SigNoz using gRPC
const otlpExporter = new OTLPLogExporterGrpc({
    headers: otlpHeaders
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
  


