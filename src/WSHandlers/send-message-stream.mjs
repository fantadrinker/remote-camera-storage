/**
 * receives event from api gateway, find the appropriate session within dynamodb table,
 * and then sends a message to that connection based on connection id.
 */

export const sendMessageStream = (event, context) => {
  console.log("got message", event);
  return {
    statusCode: 200,
  }
}

