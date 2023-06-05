import AWS from 'aws-sdk'

AWS.config.update({ region: process.env.AWS_REGION })
const s3 = new AWS.S3()

export const getStoredVideos = async event => {
  const sub = event.queryStringParameters.sub
  const limit = event.queryStringParameters.limit || 20
  const params = {
    Bucket: process.env.RECORDINGS_BUCKET,
    Prefix: `${sub}/`,
    MaxKeys: limit,
  }

  const data = await s3.listObjectsV2(params).promise()
  console.log('data: ', data)

  return JSON.stringify(data.Contents)
}
