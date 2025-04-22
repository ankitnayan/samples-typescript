// @@@SNIPSTART typescript-hello-client
import { Connection, Client } from '@temporalio/client';
import { example } from './workflows';
import { nanoid } from 'nanoid';
import { getConnectionOptions } from './connection';
import { OpenTelemetryWorkflowClientInterceptor } from '@temporalio/interceptors-opentelemetry';
import { otelSdk } from './instrumentation';

async function run() {
  try {
    // Connect to the default Server location
    // const connection = await Connection.connect({ address: 'localhost:7233' });
    // In production, pass options to configure TLS and other settings:
    // {
    //   address: 'foo.bar.tmprl.cloud',
    //   tls: {}
    // }

    const connection = await Connection.connect(await getConnectionOptions());

    const client = new Client({
      connection,
      namespace: process.env.NAMESPACE || 'default',
      // Registers OpenTelemetry Tracing interceptor for Client calls
      interceptors: {
        workflow: [new OpenTelemetryWorkflowClientInterceptor()],
      },
    });
    
    const handle = await client.workflow.start(example, {
      taskQueue: process.env.NODE_ENV === 'staging' ? 'integration' : 'hello-world',
      args: ['Temporal'],
      workflowId: 'workflow-' + nanoid(),
    });
    console.log(`Started workflow ${handle.workflowId}`);

    // optional: wait for client result
    console.log(await handle.result()); // Hello, Temporal!
  } finally {
    await otelSdk.shutdown();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

