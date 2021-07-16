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

function validateOptionalDate(date?: Date): void {
  if (
    date !== undefined && (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() > 9998 ||
      date.getFullYear() < 1970
    )
  ) throw new InvalidDebtorData('/willNotChangeUntil must be in ISO 8601 format')
}

export type ResourceReference = {
  uri: string,
}

export type DebtorIdentity = {
  type: 'DebtorIdentity',
  uri: string,
}

export type CoinPeg = {
  type: 'CoinPeg',
  exchangeRate: number,
  debtorIdentity: DebtorIdentity,
  latestDebtorInfo: ResourceReference,
}

export type BaseDebtorData = {
  summary?: string,
  debtorName: string,
  debtorHomepage?: ResourceReference,
  amountDivisor: number,
  decimalPlaces: number,
  unit: string,
  peg?: CoinPeg,
}

export type DebtorData = BaseDebtorData & {
  uri: string,
  debtorIdentity: DebtorIdentity,
  revision: number,
  latestDebtorInfo: ResourceReference,
  willNotChangeUntil?: Date,
}

export type Document = {
  contentType: string,
  content: ArrayBuffer,
}

export type DocumentWithHash = Document & {
  sha256: string,
}

export class InvalidDebtorData extends Error {
  name = 'InvalidDebtorData'
}

export const MIME_TYPE_COIN_INFO = 'application/vnd.swaptacular.coin-info+json'

/*
 This function genarates a "CoinInfo" document in
 "application/vnd.swaptacular.coin-info+json" format. This format is
 defined by a JSON Schema file (see "./schema.json",
 "./schema.md"). An `InvalidDebtorData` error will be thrown when
 invalid data is passed.
*/
export async function generateCoinInfoDocument(debtorData: DebtorData): Promise<DocumentWithHash> {
  validateOptionalDate(debtorData.willNotChangeUntil)
  const data = {
    ...debtorData,
    type: 'CoinInfo',
    willNotChangeUntil: debtorData.willNotChangeUntil?.toISOString(),
  }
  if (!validate(data)) {
    const e = validate.errors[0]
    throw new InvalidDebtorData(`${e.instancePath} ${e.message}`)
  }
  const content = UTF8_ENCODER.encode(JSON.stringify(data))
  return {
    content,
    contentType: MIME_TYPE_COIN_INFO,
    sha256: buffer2hex(await crypto.subtle.digest('SHA-256', content)),
  }
}

/*
 Currently, this function can parse only files with content type
 "application/vnd.swaptacular.coin-info+json". An `InvalidDebtorData`
 error will be thrown if the document can not be parsed.
*/
export async function parseDebtorInfoDocument(document: Document): Promise<DebtorData> {
  if (document.contentType !== MIME_TYPE_COIN_INFO) {
    throw new InvalidDebtorData('unknown content type')
  }
  if (document.content.byteLength > MAX_DOCUMENT_CONTENT_SIZE) {
    throw new InvalidDebtorData('document is too big')
  }
  let text, data
  try {
    text = UTF8_DECODER.decode(document.content)
  } catch {
    throw new InvalidDebtorData('decoding error')
  }
  try {
    data = JSON.parse(text)
  } catch {
    throw new InvalidDebtorData('parse error')
  }
  if (!validate(data)) {
    const e = validate.errors[0]
    throw new InvalidDebtorData(`${e.instancePath} ${e.message}`)
  }
  let willNotChangeUntil
  if (data.willNotChangeUntil) {
    willNotChangeUntil = new Date(data.willNotChangeUntil)
    if (Number.isNaN(willNotChangeUntil.getTime())) {
      willNotChangeUntil = undefined
    }
  }
  delete data.type
  return { ...data, willNotChangeUntil }
}
