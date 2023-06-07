/**
 * Deletes the corresponding session and/or broadcast depending on if it's viewer or broadcaster.
 */
import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
})

export const disconnectStream = async (event, context) => {

  const connectionId = event.requestContext.connectionId

  const command = new DeleteItemCommand({
    TableName: process.env.STREAM_TABLE,
    Key: {
      pk: {
        S: `connection#${connectionId}`
      }
    }
  })
  return ddbClient.send(command).then((response) => {
    return { statusCode: 200, body: "Disconnected." }
  }).catch((error) => {
    console.log("error cleaning up", error)
  })
} 
