import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { config } from './config';

const app = initializeApp({
  apiKey:     config.fbApiKey,
  authDomain: config.fbAuthDomain,
  projectId:  config.fbProjectId,
  appId:      config.fbAppId,
});

export const db = getFirestore(app);
