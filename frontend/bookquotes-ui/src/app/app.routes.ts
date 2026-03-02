import { Routes } from '@angular/router';
import { authGuard } from './core';
import {
  BookFormComponent,
  BooksComponent,
  LoginComponent,
  QuotesComponent,
  RegisterComponent
} from './pages';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'books', canActivate: [authGuard], component: BooksComponent },
  { path: 'books/new', canActivate: [authGuard], component: BookFormComponent },
  { path: 'books/:id/edit', canActivate: [authGuard], component: BookFormComponent },
  { path: 'quotes', canActivate: [authGuard], component: QuotesComponent },
  { path: '**', redirectTo: 'books' }
];
