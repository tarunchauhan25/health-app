import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';
const BACKGROUND_FETCH_TASK = 'background-fetch-task';

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log('Background location update:', locations);
    // Here you can store the location data to a database or local storage
    // For now, we'll just log it
  }
});

// Define a background fetch task for other sensors
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('Background fetch task running');
  
  try {
    // Perform any background work here
    // For example, sync sensor data to server
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function startBackgroundLocationTracking() {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 10, // Or when moved 10 meters
        foregroundService: {
          notificationTitle: 'Health App Running',
          notificationBody: 'Collecting sensor data in background',
          notificationColor: '#0099ff',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });
      
      console.log('Background location tracking started');
    } else {
      console.log('Background location tracking already registered');
    }
  } catch (error) {
    console.error('Error starting background location:', error);
  }
}

export async function stopBackgroundLocationTracking() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

export async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('Background fetch registered');
  } catch (error) {
    console.error('Error registering background fetch:', error);
  }
}

export async function unregisterBackgroundFetch() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('Background fetch unregistered');
  } catch (error) {
    console.error('Error unregistering background fetch:', error);
  }
}

export const BACKGROUND_LOCATION_TASK_NAME = LOCATION_TASK_NAME;
