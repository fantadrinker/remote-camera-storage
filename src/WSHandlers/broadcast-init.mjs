import AWS from "aws-sdk";
import { DynamoDBClient, PutItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb"

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const initBroadcast = (event, context) => {
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });

  const connId = event.requestContext.connectionId;
  const broadcastId = JSON.parse(event.body).data.broadcastId;
  if (!broadcastId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "broadcastId is required"
      })
    }
  }

  // pk: "broadcast#"+broadcastId, connectionId: connId
  const createBrCommand = new PutItemCommand({
    TableName: process.env.STREAM_TABLE,
    Item: {
      pk: {
        S: `broadcast#${broadcastId}`,
      },
      connectionId: {
        S: connId,
      }
    }
  })
  const updateConnCommand = new UpdateItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `connection#${connId}`
      }
    },
    ExpressionAttributeNames: {
      "#C": "connectionType"
    },
    ExpressionAttributeValues: {
      ":c": { S: "broadcast" }
    },
    UpdateExpression: "SET #C = :c"
  })
  return ddbClient.send(createBrCommand).then(() => {
    return ddbClient.send(updateConnCommand);
  }).then(() => {
    return manApi.postToConnection({
      ConnectionId: connId,
      Data: JSON.stringify({
        success: true
      })
    }).promise()
  }).then(() => {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Broadcast connection initialized"
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
