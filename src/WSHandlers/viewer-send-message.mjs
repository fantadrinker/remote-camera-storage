import AWS from 'aws-sdk'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })

export const sendMessage = (event, context) => {
  console.log("got message", event);
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });
  
  const connectionId = event.requestContext.connectionId

  const connKeyCond = {
    pk: { S: `connection#${connectionId}` } 
  }

  const postData = JSON.parse(event.body).data;

  const command = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: connKeyCond
  })

  return ddbClient.send(command).then(output => {
    const item = output.Item
    if (!item) {
      throw Error('No connection found')
    }
    const connType = item.connectionType
    if (connType.S !== 'viewer') {
      throw Error('Connection is not a viewer')
    }
    return item.broadcastConnectionId.S
  }).then((broadcastId) => {
    return manApi.postToConnection({
      ConnectionId: broadcastId,
      Data: JSON.stringify({
        message_type: 'viewer_message',
        payload: postData.data,
      })
    }).promise()
  }).then(() => {
    return {
      statusCode: 200,
      body: 'Data sent.'
    }
  }).catch((err) => {
    console.log(err)
    return {
      statusCode: 500,
      body: 'Failed to send data.'
    }
  })
}
