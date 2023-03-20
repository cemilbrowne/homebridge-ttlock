
import { LockList } from './lock-list';
import { LockResponse } from './lock-response';

/**
 * Represents the HTTP API model for a response with an array of locks.
 */
export interface LocksResponse extends LockResponse {

    /**
     * Gets or sets the requested locks.
     */
    list: Array<LockList>;
}
