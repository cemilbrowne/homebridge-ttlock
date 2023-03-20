export enum TTLOCK_STATES {
    locked = 0,
    unlocked = 1,
    unknown = 2,
}
export interface LockResponse {

    /**
     * Gets or sets the ID of the lock.
     */
     errcode: number;

    /**
     * Gets or sets the name of the lock.
     */
     errmsg: string;

    /**
     * Gets or sets the serial number of the lock.
     */
     description: string;

     state: TTLOCK_STATES;
}
