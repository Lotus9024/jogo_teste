export class IdentityConflictError extends Error {
  constructor(message = 'Identity conflict') {
    super(message);
    this.name = 'IdentityConflictError';
  }
}
