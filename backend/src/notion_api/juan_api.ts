import axios from 'axios';

export const request_access_token = async function (callbackuri: string, uri: string, myCode: string, authKey: string) {
  /**
   * used https://developers.notion.com/reference/create-a-token as reference for post request
   */
  return await axios.post(uri, {
      headers: {
        "Authorization": `Basic ${authKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      data: {
        "grant_type": "authorization_code",
        "code": myCode,
        "redirect_uri": callbackuri,
      }
  });
}

