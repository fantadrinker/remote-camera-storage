/**
 * receives event from api gateway, find the appropriate session within dynamodb table,
 * and then sends a message to that connection based on connection id.
 */

import AWS from "aws-sdk";
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION })

const handleViewerJoin = (connectionId, broadcastId) => {
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
      Key: {
        pk: {
          S: `connection#${connectionId}`
        }
      },
      ExpressionAttributeNames: {
        "#B": "broadcastConnectionId",
        "#C": "connectionType"
      },
      ExpressionAttributeValues: {
        ":b": { S: brConnId },
        ":c": { S: "viewer" }
      },
      UpdateExpression: "SET #B = :b, #C = :c"
    })

    return ddbClient.send(updateCommand)
  })
}

const handleBroadcastInit = (connId, broadcastId) => {
  // create an item in table, 
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
  })
}

export const sendMessageStream = (event, context) => {
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

  const messageType = postData.message_type
  // probably a good idea to get the connection type first
  
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
    if (!connType) {
      if (messageType === 'broadcast_init') {
        return handleBroadcastInit(connectionId, postData.broadcastId)
      }
      else if (messageType === 'viewer_join') {
        return handleViewerJoin(connectionId, postData.broadcastId)
      }
      throw Error('I dont know what to do with this')
    } else if (connType.S === 'viewer') {
      const brConnId = item.broadcastConnectionId
      if (!brConnId) {
        throw Error('Trying to relay message before connection setup')
      }
      console.log('sending message to broadcast', brConnId)
      return manApi.postToConnection({
        ConnectionId: brConnId.S,
        Data: JSON.stringify({
          payload: postData.data,
          message_type: 'viewer_message'
        })
      }).promise()
    } else { // broadcast
      console.log('sending message to viewer', postData.viewerId)
      return manApi.postToConnection({
        ConnectionId: postData.viewerId,
        Data: JSON.stringify({
          payload: postData.data,
          message_type: 'broadcast_message',
        })
      }).promise()
    }
  }).then(() => {
    console.log('success')
    return manApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify( messageType === 'viewer_join'? {
        message_type: 'session_created',
        payload: connectionId,
      }: { success: true }),
    }).promise()
  }).then(() => {
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

