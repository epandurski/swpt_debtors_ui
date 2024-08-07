/* NOTE: The file `./validate-schema.js` is automatically generated
 * from the `./schema.json` file, by running the following command:
 *
 * $ npx ajv compile -s schema.json -o validate-schema.js --strict=true --remove-additional=all --validate-formats=false
 */
import validate from './validate-schema.js'

const UTF8_ENCODER = new TextEncoder()
const UTF8_DECODER = new TextDecoder()
const MAX_DOCUMENT_CONTENT_SIZE = 5 * 1024 * 1024

function buffer2hex(buffer: ArrayBuffer, options = { toUpperCase: true }) {
  const bytes = [...new Uint8Array(buffer)]
  const hex = bytes.map(n => n.toString(16).padStart(2, '0')).join('')
  return options.toUpperCase ? hex.toUpperCase() : hex
}

function validateOptionalDate(date: Date | undefined, errorMsg: string): void {
  if (
    date !== undefined && (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() > 9998 ||
      date.getFullYear() < 1970
    )
  ) throw new InvalidDocument(errorMsg)
}

function parseOptionalDate(value: unknown, errorMsg?: string): Date | undefined {
  let date
  if (value !== undefined) {
    date = typeof value === 'string' ? new Date(value) : new Date(NaN)
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() > 9998 ||
      date.getFullYear() < 1970
    ) {
      if (errorMsg !== undefined) {
        throw new InvalidDocument(errorMsg)
      }
      return undefined
    }
  }
  return date
}

export type ResourceReference = {
  uri: string,
}

export type DebtorIdentity = {
  type: 'DebtorIdentity',
  uri: string,
}

export type Peg = {
  type: 'Peg',
  exchangeRate: number,
  debtorIdentity: DebtorIdentity,
  latestDebtorInfo: ResourceReference,
  display: PegDisplay,
}

export type PegDisplay = {
  type: 'PegDisplay',
  amountDivisor: number,
  decimalPlaces: bigint,
  unit: string,
}

export type BaseDebtorData = {
  summary?: string,
  debtorName: string,
  debtorHomepage?: ResourceReference,
  amountDivisor: number,
  decimalPlaces: bigint,
  unit: string,
  peg?: Peg,
}

export type DebtorData = BaseDebtorData & {
  debtorIdentity: DebtorIdentity,
  revision: bigint,
  latestDebtorInfo: ResourceReference,
  willNotChangeUntil?: Date,
  localization?: object,
}

export type Document = {
  contentType: string,
  content: ArrayBuffer,
}

export type DocumentWithHash = Document & {
  sha256: string,
}

export class InvalidDocument extends Error {
  name = 'InvalidDocument'
}

export const MIME_TYPE_COIN_INFO = 'application/vnd.swaptacular.coin-info+json'

function serializeDebtorData(debtorData: DebtorData): Uint8Array {
  validateOptionalDate(debtorData.willNotChangeUntil, '/willNotChangeUntil must be a valid Date')
  const data = {
    ...debtorData,
    type: 'CoinInfo',
    revision: Number(debtorData.revision),
    decimalPlaces: Number(debtorData.decimalPlaces),
    willNotChangeUntil: debtorData.willNotChangeUntil?.toISOString(),
    peg: debtorData.peg ? {
      ...debtorData.peg,
      display: {
        ...debtorData.peg.display,
        decimalPlaces: Number(debtorData.peg.display.decimalPlaces),
      },
    } : undefined,
  }
  if (!validate(data)) {
    const e = validate.errors[0]
    throw new InvalidDocument(`${e.instancePath} ${e.message}`)
  }
  return UTF8_ENCODER.encode(JSON.stringify(data))
}

/*
 This function genarates a document in
 "application/vnd.swaptacular.coin-info+json" format. This format is
 defined by a JSON Schema file (see "./schema.json",
 "./schema.md"). An `InvalidDocument` error will be thrown when
 invalid data is passed.
*/
export async function generateCoinInfoDocument(debtorData: DebtorData): Promise<DocumentWithHash> {
  const content = serializeDebtorData(debtorData)
  return {
    content,
    contentType: MIME_TYPE_COIN_INFO,
    sha256: await calcSha256(content),
  }
}

/*
 Currently, this function can parse only files with content type
 "application/vnd.swaptacular.coin-info+json". An `InvalidDocument`
 error will be thrown if the document can not be parsed.
*/
export async function parseDebtorInfoDocument(document: Document): Promise<DebtorData> {
  if (document.contentType !== MIME_TYPE_COIN_INFO) {
    throw new InvalidDocument('unknown content type')
  }
  if (document.content.byteLength > MAX_DOCUMENT_CONTENT_SIZE) {
    throw new InvalidDocument('document is too big')
  }
  let text, data
  try {
    text = UTF8_DECODER.decode(document.content)
  } catch {
    throw new InvalidDocument('decoding error')
  }
  try {
    data = JSON.parse(text)
  } catch {
    throw new InvalidDocument('parse error')
  }
  if (!validate(data)) {
    const e = validate.errors[0]
    throw new InvalidDocument(`${e.instancePath} ${e.message}`)
  }
  data.willNotChangeUntil = parseOptionalDate(data.willNotChangeUntil)
  data.decimalPlaces = BigInt(Math.ceil(data.decimalPlaces))
  data.revision = BigInt(Math.ceil(data.revision))
  if (data.peg?.display.decimalPlaces) {
    data.peg.display.decimalPlaces = BigInt(Math.ceil(data.peg.display.decimalPlaces))
  }
  delete data.type
  return data
}

export async function calcSha256(buffer: ArrayBuffer): Promise<string> {
  return buffer2hex(await crypto.subtle.digest('SHA-256', buffer))
}
