import AWS from 'aws-sdk'

const URL_EXPIRATION_SECONDS = 300
AWS.config.update({ region: process.env.AWS_REGION })
const s3 = new AWS.S3()

export const getObjectUrl = async event => {
  const { sub, fileID } = event.queryStringParameters
  const Key = `${sub}/${fileID}`

  // Get signed URL from S3
  const s3Params = {
    Bucket: process.env.RECORDINGS_BUCKET,
    Key,
    Expires: URL_EXPIRATION_SECONDS,
  }

  console.log('Params: ', s3Params)
  const url = await s3.getSignedUrlPromise('getObject', s3Params)

  return JSON.stringify({
    url,
  })
}
