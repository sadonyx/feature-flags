/*
  Responsible for:
    - Loading the feature flags from a data source
    - Refresh them from time to time
    - Retrieve a flag using its name and user group name

  Problem:
    Implementing the loader function inside our class requires us to preemptively decide which data source we want to use and commit to that source. This would require us to implement *different* loaders for *different* data sources.

  Open-closed principle:
    Avoid modifying our class each time we want to read from a data source.

  Solution:
    Different loaders for different data sources that are totally independent of the class.
  
  Implementation:
    Implement loader outside our class and then inject it into the constructor using dependency injection.
*/

import { EnvironmentName, FeatureFlagsLoader, FeatureFlags, FlagName, UserGroups, FeatureFlagsStartingOptions, UserGroupName, FeatureFlagContent } from '@fflags/types';

const DEFAULT_DURATION = 5 * 60; // 5 min

export class FFlagsClient {
  private readonly environmentName: EnvironmentName;
  private readonly loader: FeatureFlagsLoader; // store to call inside `refresh` method
  private flags: FeatureFlags = new Map<FlagName, UserGroups>; // represents cached data in memory
  private intervalId: NodeJS.Timeout | undefined; // necessary for setting/clearing interval

  /*
    Static factory method (no constructor):
      - Allows for more meaningful name when creating the object
      - Async operations, as our loader function will be reading from an external data store
  */
  static async start(options: FeatureFlagsStartingOptions): Promise<FFlagsClient> {
    const client = new FFlagsClient(options);
    await client.refresh();
    return client;
  }

  // stop refreshing
  stop() {
    clearInterval(this.intervalId);
  }

  // must call directly if `autoRefresh` is set to false
  async refresh(): Promise<void> {
    this.flags = await this.loader(this.environmentName);
  }

  getFlag(flagName: FlagName, userGroupName: UserGroupName): FeatureFlagContent | undefined {
    const userGroups = this.flags.get(flagName);
    if (!userGroups) return;
    const flag = userGroups[userGroupName]
    if (!flag) return;
    return JSON.parse(JSON.stringify(flag)) as FeatureFlagContent; // clone flag to return value (not reference)
  }

  // check directly whether or not a flag is enabled => call `getFlag` and return its status
  isFlagEnabled(flagName: FlagName, userGroupName: UserGroupName): boolean {
    const flag = this.getFlag(flagName, userGroupName);
    return !flag ? false : flag.enabled; // by default, return `false` if flag does not exist
  }

  private constructor(options: FeatureFlagsStartingOptions) {
    this.environmentName = options.environmentName;
    this.loader = options.featureFlagsLoader;
    if (options.autoRefresh) {
      this.startPolling(options.refreshIntervalInSeconds ?? DEFAULT_DURATION);
    }
  }

  private startPolling(intervalInSeconds: number) {
    // setInterval delay expects value in ms
    this.intervalId = setInterval(() => void this.refresh(), intervalInSeconds * 1000);
  }
}