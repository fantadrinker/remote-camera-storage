import AWS from 'aws-sdk'

const URL_EXPIRATION_SECONDS = 300
AWS.config.update({ region: process.env.AWS_REGION })
const s3 = new AWS.S3()

export const putObjectUrl = async (event) => {
  const {
    sub,
  } = event.queryStringParameters
  const randomID = parseInt(Math.random() * 10000000)
  const Key = `${sub}/${randomID}.webm`

  // Get signed URL from S3
  const s3Params = {
    Bucket: process.env.RECORDINGS_BUCKET,
    Key,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: 'video/webm',
  }

  console.log('Params: ', s3Params)
  const uploadUrl = await s3.getSignedUrlPromise(
    'putObject', 
    s3Params
  )

  return JSON.stringify({
    uploadUrl,
    Key
  })
}
