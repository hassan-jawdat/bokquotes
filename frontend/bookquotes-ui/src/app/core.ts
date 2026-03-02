import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { tap } from 'rxjs';
import { API_BASE } from './api';

export type Book = {
  id: number;
  title: string;
  author: string;
  publishedDate?: string | null;
};

export type Quote = {
  id: number;
  text: string;
  source?: string | null;
};

type AuthResponse = { token: string; username: string };

function getStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  register(username: string, password: string) {
    return this.http.post(`${API_BASE}/auth/register`, { username, password });
  }

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          const storage = getStorage();
          storage?.setItem('token', res.token);
          storage?.setItem('username', res.username);
        })
      );
  }

  logout() {
    const storage = getStorage();
    storage?.removeItem('token');
    storage?.removeItem('username');
  }

  isLoggedIn() {
    return !!getStorage()?.getItem('token');
  }

  username() {
    return getStorage()?.getItem('username') ?? '';
  }
}

@Injectable({ providedIn: 'root' })
export class BooksService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Book[]>(`${API_BASE}/books`);
  }

  create(book: Omit<Book, 'id'>) {
    return this.http.post<Book>(`${API_BASE}/books`, book);
  }

  update(id: number, book: Omit<Book, 'id'>) {
    return this.http.put(`${API_BASE}/books/${id}`, book);
  }

  delete(id: number) {
    return this.http.delete(`${API_BASE}/books/${id}`);
  }

  get(id: number) {
    return this.http.get<Book>(`${API_BASE}/books/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class QuotesService {
  constructor(private http: HttpClient) {}

  getMine() {
    return this.http.get<Quote[]>(`${API_BASE}/quotes`);
  }

  create(q: Omit<Quote, 'id'>) {
    return this.http.post<Quote>(`${API_BASE}/quotes`, q);
  }

  update(id: number, q: Omit<Quote, 'id'>) {
    return this.http.put(`${API_BASE}/quotes/${id}`, q);
  }

  delete(id: number) {
    return this.http.delete(`${API_BASE}/quotes/${id}`);
  }
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStorage()?.getItem('token');
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (getStorage()?.getItem('token')) {
    return true;
  }
  router.navigateByUrl('/login');
  return false;
};
