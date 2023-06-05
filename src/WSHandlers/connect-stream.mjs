/**
 * Creates a row in dynamodb stream table (get from env variable)
 * If it's viewer, find the broadcast, and create a 1-on-1 session
 * If it's broadcaster connecting, create a broadcast row
 */

export const connectStream = async (event, context) => {
  console.log('event', event);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'connect-stream' }),
  };
};

