import type { SpawnSyncReturns } from 'node:child_process'
import { spawn, spawnSync } from 'node:child_process'
import os from 'node:os'
import { PingResult } from './ping-result.ts'

export class Ping {
  public readonly hostname: string
  public timeoutInSeconds: number
  public count: number
  public intervalInSeconds: number
  public packetSizeInBytes: number
  public ttl: number
  public showLostPackets: boolean
  private currentCommand: string[]

  constructor(
    hostname: string,
    timeoutInSeconds: number = 5,
    count: number = 1,
    intervalInSeconds: number = 1.0,
    packetSizeInBytes: number = 56,
    ttl: number = 64,
    showLostPackets: boolean = true,
  ) {
    this.hostname = hostname
    this.timeoutInSeconds = timeoutInSeconds
    this.count = count
    this.intervalInSeconds = intervalInSeconds
    this.packetSizeInBytes = packetSizeInBytes
    this.ttl = ttl
    this.showLostPackets = showLostPackets
    this.currentCommand = []
  }

  run(): PingResult {
    const command = this.buildPingCommand()
    const result = this.executePingCommand(command)
    const combinedOutput = this.combineOutputLines(result)

    return PingResult.fromPingOutput({
      output: combinedOutput,
      returnCode: result.status ?? 1,
      host: this.hostname,
      timeout: this.timeoutInSeconds,
      interval: this.intervalInSeconds,
      packetSize: this.packetSizeInBytes,
      ttl: this.ttl,
    })
  }

  async runAsync(): Promise<PingResult> {
    const command = this.buildPingCommand()
    const result = await this.executePingCommandAsync(command)
    const combinedOutput = this.combineOutputLines(result)

    return PingResult.fromPingOutput({
      output: combinedOutput,
      returnCode: result.status ?? 1,
      host: this.hostname,
      timeout: this.timeoutInSeconds,
      interval: this.intervalInSeconds,
      packetSize: this.packetSizeInBytes,
      ttl: this.ttl,
    })
  }

  /**
   * Creates an async generator that yields ping results in real-time.
   * Useful for continuous monitoring and streaming ping data.
   *
   * @example
   * ```typescript
   * const ping = new Ping('google.com').setInterval(1).setCount(0) // infinite
   *
   * for await (const result of ping.stream()) {
   *   if (result.isSuccess()) {
   *     console.log(`${new Date().toISOString()}: ${result.averageTimeInMs()}ms`)
   *   } else {
   *     console.error(`Ping failed: ${result.error}`)
   *   }
   * }
   * ```
   */
  async* stream(): AsyncGenerator<PingResult, void, unknown> {
    let sequenceNumber = 0
    const isInfinite = this.count === 0 || this.count === Infinity

    while (true) {
      try {
        const result = await this.runSinglePing(sequenceNumber++)
        yield result

        // Stop if we've reached the count limit (unless infinite)
        if (!isInfinite && sequenceNumber >= this.count) {
          break
        }

        // Wait for the interval before next ping
        if (this.intervalInSeconds > 0) {
          await this.sleep(this.intervalInSeconds * 1000)
        }
      }
      catch (error) {
        // Yield error result instead of throwing
        yield PingResult.fromError(error as Error, this.hostname, {
          timeout: this.timeoutInSeconds,
          interval: this.intervalInSeconds,
          packetSize: this.packetSizeInBytes,
          ttl: this.ttl,
        })
      }
    }
  }

  /**
   * Creates an async generator that yields ping results with filtering and transformation.
   *
   * @param filter Optional filter function to include only specific results
   * @param transform Optional transformation function to modify yielded values
   *
   * @example
   * ```typescript
   * // Only yield successful pings with latency values
   * for await (const latency of ping.streamWithFilter(
   *   r => r.isSuccess(),
   *   r => r.averageTimeInMs()
   * )) {
   *   console.log(`Latency: ${latency}ms`)
   * }
   * ```
   */
  async* streamWithFilter<T = PingResult>(
    filter?: (result: PingResult) => boolean,
    transform?: (result: PingResult) => T,
  ): AsyncGenerator<T, void, unknown> {
    for await (const result of this.stream()) {
      if (!filter || filter(result)) {
        yield transform ? transform(result) : (result as unknown as T)
      }
    }
  }

  /**
   * Creates an async generator that yields batches of ping results.
   * Useful for processing results in chunks or implementing backpressure.
   *
   * @param bufferSize Number of results to collect before yielding a batch
   *
   * @example
   * ```typescript
   * for await (const batch of ping.streamBatched(5)) {
   *   console.log(`Processing batch of ${batch.length} results`)
   *   const avgLatency = batch
   *     .filter(r => r.isSuccess())
   *     .reduce((sum, r) => sum + r.averageTimeInMs(), 0) / batch.length
   *   console.log(`Average latency: ${avgLatency}ms`)
   * }
   * ```
   */
  async* streamBatched(bufferSize: number = 10): AsyncGenerator<PingResult[], void, unknown> {
    const buffer: PingResult[] = []

    for await (const result of this.stream()) {
      buffer.push(result)

      if (buffer.length >= bufferSize) {
        yield [...buffer]
        buffer.length = 0
      }
    }

    // Yield remaining results if any
    if (buffer.length > 0) {
      yield buffer
    }
  }

  /**
   * Runs a single ping operation with sequence number.
   * Used internally by the streaming methods.
   */
  private async runSinglePing(_sequenceNumber: number): Promise<PingResult> {
    // Create a temporary ping instance for single ping
    const singlePing = new Ping(
      this.hostname,
      this.timeoutInSeconds,
      1, // Always ping once
      this.intervalInSeconds,
      this.packetSizeInBytes,
      this.ttl,
      this.showLostPackets,
    )

    return await singlePing.runAsync()
  }

  /**
   * Sleep utility for interval timing.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  executePingCommand(commandArray: string[]): SpawnSyncReturns<string> {
    const timeout = this.calculateProcessTimeout() * 1000
    const command = commandArray[0]
    if (!command) {
      throw new Error('No command specified')
    }
    return spawnSync(command, commandArray.slice(1), {
      encoding: 'utf-8',
      timeout,
    })
  }

  executePingCommandAsync(commandArray: string[]): Promise<SpawnSyncReturns<string>> {
    return new Promise((resolve, reject) => {
      const timeout = this.calculateProcessTimeout() * 1000
      const command = commandArray[0]
      if (!command) {
        reject(new Error('No command specified'))
        return
      }

      let stdout = ''
      let stderr = ''

      const child = spawn(command, commandArray.slice(1))

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Ping command timed out after ${timeout}ms`))
      }, timeout)

      child.stdout.on('data', (data) => {
        stdout += data.toString('utf-8')
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString('utf-8')
      })

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId)

        // Create a SpawnSyncReturns-like object
        const result: SpawnSyncReturns<string> = {
          pid: child.pid || 0,
          output: [null, stdout, stderr],
          stdout,
          stderr,
          status: code,
          signal,
          error: undefined,
        }

        resolve(result)
      })

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }

  calculateProcessTimeout(): number {
    const totalPingTime = this.count * (this.timeoutInSeconds + this.intervalInSeconds)
    return Math.ceil(totalPingTime) + 5
  }

  combineOutputLines(result: SpawnSyncReturns<string>): string[] {
    const stdoutLines = result.stdout?.split('\n') || []
    const stderrLines = result.stderr?.split('\n') || []
    return [...stdoutLines, ...stderrLines].filter(Boolean)
  }

  setTimeout(timeout: number): Ping {
    this.timeoutInSeconds = timeout
    return this
  }

  setCount(count: number): Ping {
    this.count = count
    return this
  }

  setInterval(interval: number): Ping {
    this.intervalInSeconds = interval
    return this
  }

  setPacketSize(size: number): Ping {
    this.packetSizeInBytes = size
    return this
  }

  setTtl(ttl: number): Ping {
    this.ttl = ttl
    return this
  }

  setShowLostPackets(show: boolean = true): Ping {
    this.showLostPackets = show
    return this
  }

  buildPingCommand(): string[] {
    return this.startWithPingCommand()
      .addPacketCountOption()
      .addTimeoutOption()
      .addOptionalIntervalOption()
      .addOptionalPacketSizeOption()
      .addOptionalTtlOption()
      .addOptionalShowLostPacketsOption()
      .addTargetHostname()
      .getCommand()
  }

  startWithPingCommand(): Ping {
    this.currentCommand = ['ping']
    return this
  }

  getCommand(): string[] {
    return this.currentCommand
  }

  addPacketCountOption(): Ping {
    this.currentCommand.push('-c', String(this.count))
    return this
  }

  addTimeoutOption(): Ping {
    this.currentCommand.push('-W')
    if (this.isRunningOnMacOS()) {
      this.currentCommand.push(String(this.convertTimeoutToMilliseconds()))
    }
    else {
      this.currentCommand.push(String(this.timeoutInSeconds))
    }
    return this
  }

  addOptionalIntervalOption(): Ping {
    if (this.intervalInSeconds !== 1.0) {
      this.currentCommand.push('-i', String(this.intervalInSeconds))
    }
    return this
  }

  addOptionalPacketSizeOption(): Ping {
    if (this.packetSizeInBytes !== 56) {
      this.currentCommand.push('-s', String(this.packetSizeInBytes))
    }
    return this
  }

  addOptionalTtlOption(): Ping {
    if (this.ttl !== 64) {
      this.currentCommand.push('-t', String(this.ttl))
    }
    return this
  }

  addOptionalShowLostPacketsOption(): Ping {
    if (this.showLostPackets && !this.isRunningOnMacOS()) {
      this.currentCommand.push('-O')
    }
    return this
  }

  addTargetHostname(): Ping {
    this.currentCommand.push(this.hostname)
    return this
  }

  isRunningOnMacOS(): boolean {
    return os.platform() === 'darwin'
  }

  convertTimeoutToMilliseconds(): number {
    return this.timeoutInSeconds * 1000
  }
}
