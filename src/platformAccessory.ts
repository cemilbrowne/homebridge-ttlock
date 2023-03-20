import { Service, PlatformAccessory } from 'homebridge';
import { TtlockPlatform } from './platform';

import { TtlockApiClient } from './api';


enum LockState {
  Locked = 0,
  Unlocked = 1,
  Unknown = 2,
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TtlockPlatformAccessory {
  private service: Service;
  private Characteristic = this.platform.api.hap.Characteristic;
  private apiClient = new TtlockApiClient(this.platform);
  private currentState:LockState;
  private targetState:LockState;
  private pollingObject;
  private statusErrorCount: number;
  /**
   * Set possible states of the lock
   */
  public lockStates = {
    Locked: true,
  };


  constructor(
    private readonly platform: TtlockPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.statusErrorCount = 0;
    this.currentState = LockState.Unknown;
    this.targetState = LockState.Locked;
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TTLock Homebridge Platform')
      .setCharacteristic(this.platform.Characteristic.Model, String(accessory.context.device.lockVersion.groupId))
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.lockMac);

    // get the LockMechanism service if it exists, otherwise create a new LockMechanism service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.LockMechanism) ||
      this.accessory.addService(this.platform.Service.LockMechanism);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.lockAlias);

    // register handlers for the Target State Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onSet(this.handleLockTargetStateSet.bind(this))
      .onGet(this.handleLockTargetStateGet.bind(this));

    // register handlers for the Lock Current State Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.handleLockCurrentStateGet.bind(this));

    this.poll();
  }


  private async poll() {
    await this.fetchAndUpdateState();
    setTimeout(() => {
      this.poll();
    }, 10000);
  }

  private async fetchAndUpdateState() {
    this.platform.log.debug('Fetching lock status for: ' + this.accessory.context.device.lockAlias);

    // Sends the HTTP request to set the lock state
    try {
      const response = await this.apiClient.getLockStatus(this.accessory.context.device.lockId);

      switch(response.state) {
        case TTLOCK_STATES.locked:
          this.statusErrorCount = 0;
          this.platform.log.debug('Got locked state');
          if(this.currentState !== LockState.Locked) {
            this.currentState = LockState.Locked;
            this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState).updateValue(this.currentState);
          }
          break;
        case TTLOCK_STATES.unlocked:
          this.statusErrorCount = 0;
          this.platform.log.debug('Got unlocked state');
          if(this.currentState !== LockState.Unlocked) {
            this.currentState = LockState.Unlocked;
            this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState).updateValue(this.currentState);
          }
          break;
        case TTLOCK_STATES.unknown:
          this.statusErrorCount++;
          this.platform.log.debug('Got unknown state');
          if(this.currentState !== LockState.Unknown && this.statusErrorCount > 5) {
            this.currentState = LockState.Unknown;
            this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState).updateValue(this.currentState);
          }
          break;
      }

    } catch (e) {
      this.statusErrorCount++;
      if(this.statusErrorCount > 5) {
        this.platform.log.warn(`${this.accessory.context.device.lockAlias} repeated lock api errors: ${e}`);
      }

    }
  }

  returnHomekitStateFromLockState(state:LockState) {
    switch(state) {
      case LockState.Locked:
        return this.Characteristic.LockCurrentState.SECURED;
        break;
      case LockState.Unlocked:
        return this.Characteristic.LockCurrentState.UNSECURED;
        break;
      case LockState.Unknown:
        return this.Characteristic.LockCurrentState.UNKNOWN;
        break;
      default:
        return this.Characteristic.LockCurrentState.UNKNOWN;
    }
  }

  handleLockCurrentStateGet() {
    return this.returnHomekitStateFromLockState(this.currentState);
  }

  handleLockTargetStateGet() {
    return this.returnHomekitStateFromLockState(this.targetState);
  }

  async handleLockTargetStateSet(value) {
    this.targetState = value;
    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState).updateValue(this.targetState);
    try {
      if(value === this.platform.Characteristic.LockTargetState.SECURED) {
        await this.apiClient.lock(this.accessory.context.device.lockId);
      } else {
        await this.apiClient.unlock(this.accessory.context.device.lockId);
      }
    } catch (e) {
      this.platform.log.warn(`${this.accessory.context.device.lockAlias} error executing lock/unlock: ${e}`);
    }
  }
}