import AWS from 'aws-sdk'
import { DynamoDBClient, GetItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb"
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });


export const initViewer = (event, context) => {
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });

  const connectionId  = event.requestContext.connectionId

  const broadcastId = JSON.parse(event.body).data.broadcastId
  if (!broadcastId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "broadcastId is required"
      })
    }
  }

  const getBroadcastCommand = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `broadcast#${broadcastId}`
      }
    }
  })
  return ddbClient.send(getBroadcastCommand).then(output => {
    const brConnId = output.Item.connectionId?.S
    if (!brConnId) {
      throw Error('No broadcast connection found')
    }
    return brConnId
  }).then(brConnId => {
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.STREAM_TABLE,
      Key: {
        pk: {
          S: `connection#${connectionId}`
        }
      },
      ExpressionAttributeNames: {
        "#C": "connectionType",
        "#B": "broadcastConnectionId"
      },
      ExpressionAttributeValues: {
        ":c": { S: "viewer" },
        ":b": { S: brConnId }
      },
      UpdateExpression: "SET #C = :c, #B = :b"
    })
    return ddbClient.send(updateCommand)
  }).then(() => {
    return manApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        success: true,
        message_type: 'session_created',
        payload: connectionId,
      })
    }).promise()
  }).then(() => {
    return {
      statusCode: 200,
      body: 'Viewer initialized.'
    }
  }).catch((err) => {
    console.log(err)
    return {
      statusCode: 500,
      body: 'Failed to initialize viewer.'
    }
  })
}
