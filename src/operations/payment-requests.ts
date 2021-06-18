import CRC32 from 'crc-32'
import { v4 as uuidv4 } from 'uuid';
import type { CreateTransferAction } from './db'


const PAYMENT_REQUEST_REGEXP = /^SPR0\r?\n(?<crc32>.*)\r?\n(?<accountUri>.*)\r?\n(?<payeeName>.*)\r?\n(?<amount>\d+)\r?\n(?<deadline>.*)\r?\n(?<payeeReference>.*)\r?\n(?<descriptionFormat>.*)\r?\n(?<description>[\s\S]*)$/u

const MAX_INT64 = 2n ** 63n - 1n
const CONTENT_TYPE_SPR0 = 'application/vnd.swaptacular.spr0'

function removeSpr0Header(bytes: Uint8Array): Uint8Array {
  const endOfFirstLine = bytes.indexOf(10)
  const endOfSecondLine = bytes.indexOf(10, endOfFirstLine + 1)
  return bytes.slice(endOfSecondLine + 1)
}

export class IvalidPaymentRequest extends Error {
  name = 'IvalidPaymentRequest'
}

/*
 Reads files with content type "application/vnd.swaptacular.spr0"
 (Simple Payment Request version 0).

 This is a minimalist text format, whose goal is to be human readable,
 and yet be as concise as possible, so that it can be transfered via
 QR codes.

 An example payment request:
 ```````````````````````````````````````````````
 SPR0

 swpt:123/456
 This is the name of the payee
 1000
 2021-07-30T16:00:00Z
 12d3a45642665544

 This is a description of the reason
 for the payment. It may contain multiple
 lines. Everything until the end of the file
 is considered as part of the description.
 ```````````````````````````````````````````````

 In this example, "swpt:123/456" refers to the payee's account, "1000"
 is the requested amount, "2021-07-30T16:00:00Z" indicates the
 deadline for the payment, "12d3a45642665544" is the payee reference
 which need to be included in the payment note. An optional CRC32
 value can be included in the request (the empty second row).
*/
export async function readPaymentRequest(userId: number, request: Blob): Promise<CreateTransferAction> {
  if (request.type && request.type !== CONTENT_TYPE_SPR0) {
    throw new IvalidPaymentRequest('wrong content type')
  }

  const regexpMatch: any = (await request.text()).match(PAYMENT_REQUEST_REGEXP)
  if (!regexpMatch) {
    throw new IvalidPaymentRequest('parse error')
  }
  const groups = regexpMatch.groups
  const buffer = await request.arrayBuffer()

  if (groups.crc32 !== '') {
    const uint32 = CRC32.buf(removeSpr0Header(new Uint8Array(buffer))) >>> 0
    const crc32 = uint32.toString(16).padStart(8, '0')
    if (crc32 !== groups.crc32) {
      throw new IvalidPaymentRequest('CRC error')
    }
  }

  const amount = BigInt(groups.amount)
  if (amount > MAX_INT64) {
    throw new IvalidPaymentRequest('invalid amount')
  }

  let deadline
  if (groups.deadline !== '') {
    deadline = new Date(groups.deadline)
    if (Number.isNaN(deadline.getTime())) {
      throw new IvalidPaymentRequest('invalid deadline')
    }
  }

  // Currently, the description can only be plain text. This is
  // indicated by an empty string in the `descriptionFormat` filed.
  if (groups.descriptionFormat !== '') {
    throw new IvalidPaymentRequest('invalid description format')
  }

  return {
    userId,
    actionType: 'CreateTransfer',
    createdAt: new Date(),
    creationRequest: {
      type: 'TransferCreationRequest',
      recipient: { uri: groups.accountUri },
      amount,
      transferUuid: uuidv4(),
      noteFormat: 'payeeref',
      note: groups.payeeReference,
    },
    paymentInfo: {
      payeeName: groups.payeeName,
      paymentRequest: {
        content: buffer,
        contentType: CONTENT_TYPE_SPR0,
      }
    }
  }
}
