/** An expected error with the HTTP status the client should receive. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
