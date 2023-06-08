import AWS from "aws-sdk";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const sendMessage = (event, context) => {
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
    if (connType.S !== 'broadcast') {
      throw Error('Connection is not a broadcast connection')
    }
    return item
  }).then(() => {
    return manApi.postToConnection({
      ConnectionId: postData.viewerId,
      Data: JSON.stringify({
        payload: postData.data,
        message_type: 'broadcast_message',
      })
    }).promise()
  }).then(() => {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Message sent"
      })
    }
  }).catch(err => {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message
      })
    }
  })
}
