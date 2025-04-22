import { delay } from "./workflows";
import {lookup} from 'dns';
import { readFile } from 'node:fs';
import connect from 'connect';
import { log } from '@temporalio/activity';
import { processRequest } from './worker';
// @@@SNIPSTART typescript-hello-activity



export async function greet(name: string): Promise<string> {

  await delay(3000);
  
  // await fetch('https://signoz.io/');

  lookup('google.com',  (err, address) => {
    console.log('address: ', address);
  }); 

  const app = connect();

  app.use((req: any, res: any, next: () => void) => {
    // middleware 1
    next();
  });

  readFile('/etc/passwd', (err, _data) => {
    if (err) throw err;
  }); 

  log.error('Hello, world!');
  processRequest();
  return `Hello, ${name}!`;
}
// @@@SNIPEND
