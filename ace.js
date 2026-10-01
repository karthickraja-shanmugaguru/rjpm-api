/*
|--------------------------------------------------------------------------
| JavaScript entrypoint for running ace commands
|--------------------------------------------------------------------------
|
| DO NOT MODIFY THIS FILE AS IT WILL BE OVERRIDDEN DURING THE BUILD
| PROCESS.
|
| See docs.adonisjs.com/guides/typescript-build-process#creating-production-build
|
| Since, we cannot run TypeScript source code using "node" binary, we need
| a JavaScript entrypoint to run ace commands.
|
| This file registers the "ts-node/esm" hook with the Node.js module system
| and then imports the "bin/console.ts" file.
|
*/

process.on('uncaughtException', (err) => {
  console.error('*** ACE UNCAUGHT EXCEPTION ***:', err)
  process.exit(1)
})
process.on('unhandledRejection', (err) => {
  console.error('*** ACE UNHANDLED REJECTION ***:', err)
  process.exit(1)
})

/**
 * Register hook to process TypeScript files using ts-node
 */
await import('ts-node-maintained/register/esm')

/**
 * Import ace console entrypoint
 */
await import('./bin/console.js')
