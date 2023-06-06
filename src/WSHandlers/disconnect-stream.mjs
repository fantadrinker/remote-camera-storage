/**
 * Deletes the corresponding session and/or broadcast depending on if it's viewer or broadcaster.
 */
import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
})

export const disconnectStream = async (event, context) => {

  const protocol = event.headers['Sec-Websocket-Protocol'] || event.multiValueHeaders['Sec-Websocket-Protocol']
  const connectionId = event.requestContext.connectionId

  const command = new DeleteItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `connection#${connectionId}`
      }
    }
  })
  ddbClient.send(command).then((response) => {
    console.log("disconnect successfully", response)
  }).catch((error) => {
    console.log("error cleaning up", error)
  })
  return;
} 
