export class PingResultLine {
  public readonly rawLine: string
  public readonly timeInMs: number

  constructor(line: string = '', timeInMs: number = 0.0) {
    this.rawLine = line.trim()
    this.timeInMs = timeInMs
  }

  static fromLine(line: string): PingResultLine {
    let timeInMs: number = 0.0
    const match = line.match(/time([<=]+)([0-9.]+)\s*ms/i)
    if (match && match[2]) {
      timeInMs = Number.parseFloat(match[2])
    }

    return new PingResultLine(line, timeInMs)
  }

  getRawLine(): string {
    return this.rawLine
  }

  getTimeInMs(): number {
    return this.timeInMs
  }

  toArray(): { line: string, time_in_ms: number } {
    return {
      line: this.rawLine,
      time_in_ms: this.timeInMs,
    }
  }

  toString(): string {
    return this.rawLine
  }
}

export const PingError = {
  HostnameNotFound: 'HostnameNotFound',
  HostUnreachable: 'HostUnreachable',
  PermissionDenied: 'PermissionDenied',
  Timeout: 'Timeout',
  UnknownError: 'UnknownError',
} as const

export type PingErrorType = typeof PingError[keyof typeof PingError]

export const PingErrorUtils = {
  from: (value: string): PingErrorType => {
    return Object.values(PingError).includes(value as PingErrorType)
      ? value as PingErrorType
      : PingError.UnknownError
  },
}

interface PingResultOptions {
  output: string[]
  returnCode: number
  host: string
  timeout: number
  interval: number
  packetSize: number
  ttl: number
}

interface PingResultData {
  success: boolean
  error: PingErrorType | null
  host: string | null
  packetLossPercentage: number
  numberOfPacketsTransmitted: number | null
  numberOfPacketsReceived: number | null
  timeoutInSeconds: number | null
  intervalInSeconds: number
  packetSizeInBytes: number
  ttl: number
  minimumTimeInMs: number | null
  maximumTimeInMs: number | null
  averageTimeInMs: number | null
  standardDeviationTimeInMs: number | null
  rawOutput: string
  lines: PingResultLine[]
}

export interface PingResultArray {
  success: boolean
  error: PingErrorType | null
  host: string | null
  packet_loss_percentage: number
  packets_transmitted: number | null
  packets_received: number | null
  options: {
    timeout_in_seconds: number | null
    interval: number
    packet_size_in_bytes: number
    ttl: number
  }
  timings: {
    minimum_time_in_ms: number | null
    maximum_time_in_ms: number | null
    average_time_in_ms: number | null
    standard_deviation_time_in_ms: number | null
  }
  raw_output: string
  lines: { line: string, time_in_ms: number }[]
}

export interface SuccessfulPingResult extends PingResult {
  readonly success: true
  readonly error: null
  readonly host: string
  readonly numberOfPacketsTransmitted: number
  readonly numberOfPacketsReceived: number
}

export interface FailedPingResult extends PingResult {
  readonly success: false
  readonly error: PingErrorType
  readonly packetLossPercentage: 100
  readonly minimumTimeInMs: null
  readonly maximumTimeInMs: null
  readonly averageTimeInMs: null
  readonly standardDeviationTimeInMs: null
}

export class PingResult {
  public readonly success: boolean
  public readonly error: PingErrorType | null
  public readonly host: string | null
  public readonly packetLossPercentage: number
  public readonly numberOfPacketsTransmitted: number | null
  public readonly numberOfPacketsReceived: number | null
  public readonly timeoutInSeconds: number | null
  public readonly intervalInSeconds: number
  public readonly packetSizeInBytes: number
  public readonly ttl: number
  public readonly minimumTimeInMs: number | null
  public readonly maximumTimeInMs: number | null
  public readonly averageTimeInMs: number | null
  public readonly standardDeviationTimeInMs: number | null
  public readonly rawOutput: string
  public readonly lines: PingResultLine[]

  private constructor(data: PingResultData) {
    this.success = data.success
    this.error = data.error
    this.host = data.host
    this.packetLossPercentage = data.packetLossPercentage
    this.numberOfPacketsTransmitted = data.numberOfPacketsTransmitted
    this.numberOfPacketsReceived = data.numberOfPacketsReceived
    this.timeoutInSeconds = data.timeoutInSeconds
    this.intervalInSeconds = data.intervalInSeconds
    this.packetSizeInBytes = data.packetSizeInBytes
    this.ttl = data.ttl
    this.minimumTimeInMs = data.minimumTimeInMs
    this.maximumTimeInMs = data.maximumTimeInMs
    this.averageTimeInMs = data.averageTimeInMs
    this.standardDeviationTimeInMs = data.standardDeviationTimeInMs
    this.rawOutput = data.rawOutput
    this.lines = data.lines
  }

  isSuccess(): this is SuccessfulPingResult {
    return this.success
  }

  isFailure(): this is FailedPingResult {
    return !this.success
  }

  static fromPingOutput({ output, returnCode, host, timeout, interval, packetSize, ttl }: PingResultOptions): PingResult {
    const rawOutput = output.join('\n')

    if (returnCode !== 0) {
      const error = PingResult.determineErrorFromOutput(rawOutput)
      return new PingResult({
        success: false,
        error,
        host,
        packetLossPercentage: 100,
        numberOfPacketsTransmitted: null,
        numberOfPacketsReceived: null,
        timeoutInSeconds: timeout,
        intervalInSeconds: interval,
        packetSizeInBytes: packetSize,
        ttl,
        minimumTimeInMs: null,
        maximumTimeInMs: null,
        averageTimeInMs: null,
        standardDeviationTimeInMs: null,
        rawOutput,
        lines: [],
      })
    }

    const lines = PingResult.parsePingLines(output)

    let packetLossPercentage = 0
    let numberOfPacketsTransmitted: number | null = null
    let numberOfPacketsReceived: number | null = null
    let minimumTimeInMs: number | null = null
    let maximumTimeInMs: number | null = null
    let averageTimeInMs: number | null = null
    let standardDeviationTimeInMs: number | null = null

    // Extract packet statistics
    const packetMatch = rawOutput.match(/(\d+)\s+packets?\s+transmitted,\s+(\d+)\s+(?:packets?\s+)?received/i)
    if (packetMatch && packetMatch[1] && packetMatch[2]) {
      const transmitted = Number.parseInt(packetMatch[1], 10)
      const received = Number.parseInt(packetMatch[2], 10)
      numberOfPacketsTransmitted = transmitted
      numberOfPacketsReceived = received
      packetLossPercentage = PingResult.calculatePacketLossPercentage(transmitted, received)
    }

    // Extract timing statistics
    const timingMatch = rawOutput.match(/min\/avg\/max\/(?:stddev|mdev)\s*=\s*([0-9.]+)\/([0-9.]+)\/([0-9.]+)\/([0-9.]+)\s*ms/i)
    if (timingMatch && timingMatch[1] && timingMatch[2] && timingMatch[3] && timingMatch[4]) {
      minimumTimeInMs = Number.parseFloat(timingMatch[1])
      averageTimeInMs = Number.parseFloat(timingMatch[2])
      maximumTimeInMs = Number.parseFloat(timingMatch[3])
      standardDeviationTimeInMs = Number.parseFloat(timingMatch[4])
    }

    // Fallback for packet loss percentage
    if (numberOfPacketsTransmitted === null) {
      const lossMatch = rawOutput.match(/(\d+)%\s*(packet\s*)?loss/i)
      if (lossMatch && lossMatch[1]) {
        packetLossPercentage = Number.parseInt(lossMatch[1], 10)
      }
    }

    const success = packetLossPercentage < 100

    return new PingResult({
      success,
      error: null,
      host,
      packetLossPercentage,
      numberOfPacketsTransmitted,
      numberOfPacketsReceived,
      timeoutInSeconds: timeout,
      intervalInSeconds: interval,
      packetSizeInBytes: packetSize,
      ttl,
      minimumTimeInMs,
      maximumTimeInMs,
      averageTimeInMs,
      standardDeviationTimeInMs,
      rawOutput,
      lines,
    })
  }

  static determineErrorFromOutput(output: string): PingErrorType {
    const lower = output.toLowerCase()

    if (lower.includes('unknown host') || lower.includes('name or service not known')) {
      return PingError.HostnameNotFound
    }
    if (lower.includes('no route to host') || lower.includes('host unreachable')) {
      return PingError.HostUnreachable
    }
    if (lower.includes('permission denied')) {
      return PingError.PermissionDenied
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return PingError.Timeout
    }

    return PingError.UnknownError
  }

  static parsePingLines(output: string[]): PingResultLine[] {
    return output
      .map(line => line.trim())
      .filter(line => !!line && PingResult.isPingResponseLine(line))
      .map(line => PingResultLine.fromLine(line))
  }

  static isPingResponseLine(line: string): boolean {
    return /time[<=]+[0-9.]+\s*ms/i.test(line)
  }

  static calculatePacketLossPercentage(transmitted: number, received: number): number {
    if (transmitted === 0)
      return 100
    return Math.round(((transmitted - received) / transmitted) * 100)
  }

  averageResponseTimeInMs(): number {
    if (this.averageTimeInMs != null) {
      return this.averageTimeInMs
    }

    if (this.lines.length === 0) {
      return 0
    }

    const total = this.lines.reduce((sum, line) => sum + line.timeInMs, 0)
    return total / this.lines.length
  }

  toArray(): PingResultArray {
    return {
      success: this.success,
      error: this.error,
      host: this.host,
      packet_loss_percentage: this.packetLossPercentage,
      packets_transmitted: this.numberOfPacketsTransmitted,
      packets_received: this.numberOfPacketsReceived,
      options: {
        timeout_in_seconds: this.timeoutInSeconds,
        interval: this.intervalInSeconds,
        packet_size_in_bytes: this.packetSizeInBytes,
        ttl: this.ttl,
      },
      timings: {
        minimum_time_in_ms: this.minimumTimeInMs,
        maximum_time_in_ms: this.maximumTimeInMs,
        average_time_in_ms: this.averageTimeInMs,
        standard_deviation_time_in_ms: this.standardDeviationTimeInMs,
      },
      raw_output: this.rawOutput,
      lines: this.lines.map(line => line.toArray()),
    }
  }

  toString(): string {
    return this.rawOutput
  }
}
