import { DOCUMENT, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core';

@Component({
  selector: 'app-root',
  imports: [NgClass, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly darkMode = signal(false);

  toggleDarkMode() {
    const next = !this.darkMode();
    this.darkMode.set(next);
    this.document.body.classList.toggle('theme-dark', next);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
