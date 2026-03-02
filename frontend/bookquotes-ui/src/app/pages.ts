import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, Book, BooksService, Quote, QuotesService } from './core';

function getErrorMessage(error: unknown, fallback: string) {
  const err = error as { error?: { message?: string } | string; message?: string } | null;
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
    return err.error.message;
  }
  return err?.message ?? fallback;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h2 class="h4 mb-3">Login</h2>
            @if (errorMessage) {
              <div class="alert alert-danger py-2">{{ errorMessage }}</div>
            }
            <form (ngSubmit)="submit()">
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input class="form-control" [(ngModel)]="username" name="username" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input class="form-control" type="password" [(ngModel)]="password" name="password" required />
              </div>
              <button class="btn btn-primary w-100" [disabled]="loading">
                {{ loading ? 'Logging in...' : 'Login' }}
              </button>
            </form>
            <p class="mt-3 mb-0 text-center">No account? <a routerLink="/register">Create one</a></p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  submit() {
    this.errorMessage = '';
    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/books');
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = getErrorMessage(error, 'Login failed.');
      }
    });
  }
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h2 class="h4 mb-3">Register</h2>
            @if (successMessage) {
              <div class="alert alert-success py-2">{{ successMessage }}</div>
            }
            @if (errorMessage) {
              <div class="alert alert-danger py-2">{{ errorMessage }}</div>
            }
            <form (ngSubmit)="submit()">
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input class="form-control" [(ngModel)]="username" name="username" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input class="form-control" type="password" [(ngModel)]="password" name="password" required />
              </div>
              <button class="btn btn-success w-100" [disabled]="loading">
                {{ loading ? 'Creating account...' : 'Register' }}
              </button>
            </form>
            <p class="mt-3 mb-0 text-center">Already have an account? <a routerLink="/login">Login</a></p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  submit() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;
    this.auth.register(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Account created. You can now log in.';
        setTimeout(() => this.router.navigateByUrl('/login'), 800);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = getErrorMessage(error, 'Register failed.');
      }
    });
  }
}

@Component({
  selector: 'app-books',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h2 class="h3 mb-0">Books</h2>
        <small class="text-muted">Manage your books</small>
      </div>
      <a class="btn btn-primary" routerLink="/books/new">
        <i class="fa-solid fa-plus me-1"></i> New Book
      </a>
    </div>

    @if (errorMessage) {
      <div class="alert alert-danger">{{ errorMessage }}</div>
    }

    <div class="card shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Published</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (book of books; track book.id) {
                <tr>
                  <td>{{ book.title }}</td>
                  <td>{{ book.author }}</td>
                  <td>{{ book.publishedDate ? (book.publishedDate | date: 'yyyy-MM-dd') : '-' }}</td>
                  <td class="text-end">
                    <a class="btn btn-sm btn-outline-primary me-2" [routerLink]="['/books', book.id, 'edit']">
                      Edit
                    </a>
                    <button class="btn btn-sm btn-outline-danger" type="button" (click)="remove(book)">
                      Delete
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-4 text-muted">No books yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class BooksComponent {
  private readonly booksService = inject(BooksService);

  books: Book[] = [];
  errorMessage = '';

  constructor() {
    this.load();
  }

  load() {
    this.errorMessage = '';
    this.booksService.getAll().subscribe({
      next: (books) => (this.books = books),
      error: (error) => (this.errorMessage = getErrorMessage(error, 'Could not load books.'))
    });
  }

  remove(book: Book) {
    if (!confirm(`Delete "${book.title}"?`)) return;
    this.booksService.delete(book.id).subscribe({
      next: () => this.load(),
      error: (error) => (this.errorMessage = getErrorMessage(error, 'Could not delete book.'))
    });
  }
}

@Component({
  selector: 'app-book-form',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h3 mb-0">{{ isEdit ? 'Edit Book' : 'New Book' }}</h2>
          <a class="btn btn-outline-secondary" routerLink="/books">Back</a>
        </div>

        <div class="card shadow-sm">
          <div class="card-body">
            @if (errorMessage) {
              <div class="alert alert-danger">{{ errorMessage }}</div>
            }
            <form (ngSubmit)="save()">
              <div class="mb-3">
                <label class="form-label">Title</label>
                <input class="form-control" [(ngModel)]="model.title" name="title" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Author</label>
                <input class="form-control" [(ngModel)]="model.author" name="author" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Published date</label>
                <input class="form-control" type="date" [(ngModel)]="model.publishedDate" name="publishedDate" />
              </div>
              <button class="btn btn-primary" [disabled]="loading">
                {{ loading ? 'Saving...' : 'Save' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BookFormComponent {
  private readonly booksService = inject(BooksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id: number | null = null;
  isEdit = false;
  loading = false;
  errorMessage = '';
  model = { title: '', author: '', publishedDate: '' };

  constructor() {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) return;
    this.id = Number(rawId);
    this.isEdit = true;
    this.load(this.id);
  }

  private load(id: number) {
    this.booksService.get(id).subscribe({
      next: (book) => {
        this.model = {
          title: book.title ?? '',
          author: book.author ?? '',
          publishedDate: book.publishedDate ? String(book.publishedDate).slice(0, 10) : ''
        };
      },
      error: (error) => (this.errorMessage = getErrorMessage(error, 'Could not load book.'))
    });
  }

  save() {
    this.errorMessage = '';
    this.loading = true;
    const payload = {
      title: this.model.title.trim(),
      author: this.model.author.trim(),
      publishedDate: this.model.publishedDate || null
    };
    const request$ =
      this.isEdit && this.id !== null
        ? this.booksService.update(this.id, payload)
        : this.booksService.create(payload);
    request$.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/books');
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = getErrorMessage(error, 'Could not save book.');
      }
    });
  }
}

@Component({
  selector: 'app-quotes',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h2 class="h3 mb-0">Quotes</h2>
        <small class="text-muted">Your saved quotes</small>
      </div>
    </div>

    @if (errorMessage) {
      <div class="alert alert-danger">{{ errorMessage }}</div>
    }

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h3 class="h5 mb-3">{{ editId !== null ? 'Edit quote' : 'Add quote' }}</h3>
        <form (ngSubmit)="save()">
          <div class="mb-3">
            <label class="form-label">Quote text</label>
            <textarea class="form-control" rows="3" [(ngModel)]="form.text" name="text" required></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label">Source (optional)</label>
            <input class="form-control" [(ngModel)]="form.source" name="source" />
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary" [disabled]="loading">
              {{ loading ? 'Saving...' : (editId !== null ? 'Update' : 'Add Quote') }}
            </button>
            @if (editId !== null) {
              <button class="btn btn-outline-secondary" type="button" (click)="cancelEdit()">Cancel</button>
            }
          </div>
        </form>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body p-0">
        <ul class="list-group list-group-flush">
          @for (quote of quotes; track quote.id) {
            <li class="list-group-item">
              <div class="d-flex justify-content-between gap-3">
                <div>
                  <p class="mb-1">"{{ quote.text }}"</p>
                  <small class="text-muted">{{ quote.source || 'Unknown source' }}</small>
                </div>
                <div class="d-flex gap-2 align-items-start">
                  <button class="btn btn-sm btn-outline-primary" type="button" (click)="startEdit(quote)">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" type="button" (click)="remove(quote)">Delete</button>
                </div>
              </div>
            </li>
          } @empty {
            <li class="list-group-item text-center py-4 text-muted">No quotes yet.</li>
          }
        </ul>
      </div>
    </div>
  `
})
export class QuotesComponent {
  private readonly quotesService = inject(QuotesService);

  quotes: Quote[] = [];
  editId: number | null = null;
  loading = false;
  errorMessage = '';
  form = { text: '', source: '' };

  constructor() {
    this.load();
  }

  load() {
    this.errorMessage = '';
    this.quotesService.getMine().subscribe({
      next: (quotes) => (this.quotes = quotes),
      error: (error) => (this.errorMessage = getErrorMessage(error, 'Could not load quotes.'))
    });
  }

  save() {
    this.errorMessage = '';
    this.loading = true;
    const payload = { text: this.form.text.trim(), source: this.form.source.trim() || null };
    const request$ =
      this.editId !== null
        ? this.quotesService.update(this.editId, payload)
        : this.quotesService.create(payload);
    request$.subscribe({
      next: () => {
        this.loading = false;
        this.cancelEdit();
        this.load();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = getErrorMessage(error, 'Could not save quote.');
      }
    });
  }

  startEdit(quote: Quote) {
    this.editId = quote.id;
    this.form = { text: quote.text ?? '', source: quote.source ?? '' };
  }

  cancelEdit() {
    this.editId = null;
    this.form = { text: '', source: '' };
  }

  remove(quote: Quote) {
    if (!confirm('Delete this quote?')) return;
    this.quotesService.delete(quote.id).subscribe({
      next: () => {
        if (this.editId === quote.id) this.cancelEdit();
        this.load();
      },
      error: (error) => (this.errorMessage = getErrorMessage(error, 'Could not delete quote.'))
    });
  }
}
