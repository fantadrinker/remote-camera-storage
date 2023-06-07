import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const URL_EXPIRATION_SECONDS = 300
const s3Client = new S3Client({ region: process.env.AWS_REGION })

export const getObjectUrl = event => {
  const { sub, fileID } = event.queryStringParameters
  const Key = `${sub}/${fileID}`

  const getCommand = new GetObjectCommand({
    Bucket: process.env.RECORDINGS_BUCKET,
    Key,
  })

  return getSignedUrl(
    s3Client, 
    getCommand, 
    { expiresIn: URL_EXPIRATION_SECONDS }).then(url => {
      return JSON.stringify({
        url,
      })
    })
}
