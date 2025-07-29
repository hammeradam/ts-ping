/**
 * Example demonstrating basic ping functionality in ts-ping
 * Run with: npx tsx examples/simple.ts
 *
 * This file showcases:
 * - Synchronous ping execution
 * - Asynchronous ping execution
 * - Basic error handling
 * - Result type checking
 */

import { Ping } from '../src/ping.ts'

console.log('ts-ping Basic Examples')
console.log('======================\n')

// Example 1: Synchronous Ping
async function synchronousExample() {
  console.log('Example 1: Synchronous Ping')
  console.log('---------------------------')

  const ping = new Ping('google.com').setCount(3).setTimeout(3)
  const result = ping.run()

  if (result.isSuccess()) {
    console.log(`Successfully pinged ${result.host}`)
    console.log(`Packets: ${result.numberOfPacketsTransmitted} sent, ${result.numberOfPacketsReceived} received`)
    console.log(`Packet loss: ${result.packetLossPercentage}%`)
    console.log(`Average time: ${result.averageTimeInMs}ms\n`)
  }
  else if (result.isFailure()) {
    console.error(`Ping failed: ${result.error}`)
    console.error(`Host: ${result.host || 'unknown'}\n`)
  }
}

// Example 2: Asynchronous Ping
async function asynchronousExample() {
  console.log('Example 2: Asynchronous Ping')
  console.log('-----------------------------')

  try {
    const asyncPing = new Ping('google.com').setCount(2).setTimeout(5)
    const asyncResult = await asyncPing.runAsync()

    if (asyncResult.isSuccess()) {
      console.log(`Async ping successful to ${asyncResult.host}`)
      console.log(`Average time: ${asyncResult.averageResponseTimeInMs()}ms`)
      console.log(`Packet loss: ${asyncResult.packetLossPercentage}%\n`)
    }
    else {
      console.error(`Async ping failed: ${asyncResult.error}\n`)
    }
  }
  catch (error) {
    console.error('Async ping threw an error:', error)
    console.log()
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await synchronousExample()
    await asynchronousExample()

    console.log('All basic examples completed!')
  }
  catch (error) {
    console.error('Error running examples:', error)
  }
}

runAllExamples()
