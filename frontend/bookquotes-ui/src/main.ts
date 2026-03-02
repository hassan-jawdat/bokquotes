import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  void import('bootstrap');
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
