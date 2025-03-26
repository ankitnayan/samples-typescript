import { delay } from "./workflows";
import {lookup} from 'dns';
import { readFile } from 'node:fs';
import connect from 'connect';
import { log } from '@temporalio/activity';
// @@@SNIPSTART typescript-hello-activity



export async function greet(name: string): Promise<string> {

  await delay(3000);
  
  await fetch('https://signoz.io/');

  lookup('google.com',  (err, address) => {
    console.log('address: ', address);
  }); 

  const app = connect();

  app.use((req: any, res: any, next: () => void) => {
    // middleware 1
    next();
  });

  readFile('/etc/passwd', (err, data) => {
    if (err) throw err;
    console.log(data);
  }); 

  log.info('Hello, world!');
  return `Hello, ${name}!`;
}
// @@@SNIPEND
