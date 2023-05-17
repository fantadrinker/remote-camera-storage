

import AWS from 'aws-sdk'

const URL_EXPIRATION_SECONDS = 300
AWS.config.update({ region: process.env.AWS_REGION })
const s3 = new AWS.S3()

export const getAccessUrl = async (event) => {
  const randomID = parseInt(Math.random() * 10000000)
  const Key = `${randomID}.webm`

  // Get signed URL from S3
  const s3Params = {
    Bucket: process.env.RECORDINGS_BUCKET,
    Key,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: 'video/webm',

    // This ACL makes the uploaded object publicly readable. You must also uncomment
    // the extra permission for the Lambda function in the SAM template.

    // ACL: 'public-read'
  }

  console.log('Params: ', s3Params)
  const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params)

  return JSON.stringify({
    uploadURL: uploadURL,
    Key
  })
}