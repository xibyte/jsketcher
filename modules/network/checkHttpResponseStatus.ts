import {createHttpError} from "network/createHttpError";

export function checkHttpResponseStatus(res: Response) {
  if (res.ok) {
    return res;
  } else {
    throw createHttpError(res);
  }
}
