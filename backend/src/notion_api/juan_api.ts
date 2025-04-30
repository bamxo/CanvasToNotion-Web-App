import axios, {Axios, AxiosResponse} from 'axios';
export const request_access_token = async function (callbackuri: string, uri: string, myCode: string, authKey: string): Promise<AxiosResponse>{
  /**
   * used https://developers.notion.com/reference/create-a-token as reference for post request
   */
  const res: AxiosResponse = await axios.post(uri, {
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
  return res;
}
export const post_to_db = async function (data: string) {
  // need to have some way to speak to firebase servers.
}
