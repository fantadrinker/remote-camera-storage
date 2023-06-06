/**
 * receives event from api gateway, find the appropriate session within dynamodb table,
 * and then sends a message to that connection based on connection id.
 */

import AWS from "aws-sdk";
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })

const handleViewerJoin = (broadcastId) => {
  const getBroadcastCommand = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `broadcast#${broadcastId}`
      }
    }
  })
  return ddbClient.send(getBroadcastCommand).then(response => {
    // get the connection id from broadcast item,
    // then add that field to viewer connection
    const brConnId = response.Item.connectionId?.S

    if (!brConnId) {
      throw Error('No broadcast found')
    }
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.STREAM_TABLE,
      Key: connKeyCond,
      ExpressionAttributeNames: {
        "#B": "broadcastConnectionId"
      },
      ExpressionAttributeValues: {
        ":b": brConnId
      },
      UpdateExpression: "SET #B = :b"
    })

    return ddbClient.send(updateCommand)
  })
}

const handleBroadcastInit = (connId, broadcastId) => {
  // create an item in table, 
  // pk: "broadcast#"+broadcastId, connectionId: connId
  const createBrCommand = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: {
        S: `broadcast#${broadcastId}`,
      },
      connectionId: {
        S: connId,
      }
    }
  })

  return ddbClient.send(createBrCommand);
}

export const sendMessageStream = (event, context) => {
  console.log("got message", event);
  const manApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });
  
  manApi.post

  const connectionId = event.requestContext.connectionId

  const connKeyCond = {
    pk: { S: `connection#${connectionId}` } 
  }

  const postData = JSON.parse(event.body).data;

  const messageType = postData.message_type
  // probably a good idea to get the connection type first
  
  const command = new GetItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: connKeyCond
  })

  return ddbClient.send(command).then(output => {
    const connType = output.Item.connectionType.S
    if (connType === 'viewer') {
      if (messageType === 'viewer_join') {
        return handleViewerJoin(postData.broadcastId)
      } else if (messageType === 'viewer_message') {
        return manApi.postToConnection({
          ConnectionId: output.Item.broadcastConnectionId.S,
          Data: postData.data
        })
      }
    } else { // broadcast
      if (messageType === 'broadcast_init') {
        return handleBroadcastInit(connectionId, postData.broadcastId)
      } else if (messageType === 'broadcast_message') {
        return manApi.postToConnection({
          ConnectionId: postData.viewerId,
          Data: postData.data
        })
      }
    }
    throw Error('I dont know what to do with this')
  }).then(() => {
    manApi.postToConnection({
      ConnectionId: connectionId,
      Data: 'success',
    })
    return {
      statusCode: 200,
      body: 'success'
    }
  }).catch(err => {
    console.log('error processing user message', err)
    return {
      statusCode: 500,
      body: 'failed'
    }
  })
}

