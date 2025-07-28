import { Ping } from './ping.js'

// Example usage of the Ping library

// Synchronous example
console.log('=== Synchronous Ping ===')
const ping = new Ping('google.com').setCount(3).setTimeout(3)
const result = ping.run()

if (result.isSuccess()) {
  console.log(`Successfully pinged ${result.host}`)
  console.log(
    `Packets: ${result.numberOfPacketsTransmitted} sent, ${result.numberOfPacketsReceived} received`,
  )
  console.log(`Packet loss: ${result.packetLossPercentage}%`)
}
else if (result.isFailure()) {
  console.error(`Ping failed: ${result.error}`)
  console.error(`Host: ${result.host || 'unknown'}`)
}

// Asynchronous example
async function asyncExample() {
  console.log('\n=== Asynchronous Ping ===')

  try {
    const asyncPing = new Ping('google.com').setCount(2).setTimeout(5)
    const asyncResult = await asyncPing.runAsync()

    if (asyncResult.isSuccess()) {
      console.log(`Async ping successful to ${asyncResult.host}`)
      console.log(`Average time: ${asyncResult.averageResponseTimeInMs()}ms`)
    }
    else {
      console.error(`Async ping failed: ${asyncResult.error}`)
    }
  }
  catch (error) {
    console.error('Async ping threw an error:', error)
  }
}

// Run the async example
asyncExample().catch(console.error)
