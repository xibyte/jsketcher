
export class HttpError extends Error {

  status: number;
  readonly isHttpError = true;

  constructor(status: number, statusText: string) {
    super(status + ": " + statusText);
  }

}

export function createHttpError(res: Response) {
  return new HttpError(res.status, res.statusText);
}
