# Hello World

This is the default project that is scaffolded out when you run `npx @temporalio/create@latest ./myfolder`.

The [Hello World Tutorial](https://learn.temporal.io/getting_started/typescript/hello_world_in_typescript/) walks through the code in this sample.

### Running this sample

1. `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).
1. `npm install` to install dependencies.
1. `npm run start.watch` to start the Worker.
1. In another shell, `npm run workflow` to run the Workflow Client.

The Workflow should return:

```bash
Hello, Temporal!
```


## Working with temporal cloud and signoz cloud
 Run command
 ```
OTEL_EXPORTER_OTLP_ENDPOINT='https://ingest.<region>.signoz.cloud:443' OTEL_RESOURCE_ATTRIBUTES="service.name=<service name>" OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key=<ingestion key>" npm run start.watch
 ```