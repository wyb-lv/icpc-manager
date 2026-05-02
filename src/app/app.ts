import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar';
import { HeaderComponent } from './header/header';
import { FooterComponent } from './footer/footer';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);

  // Signal to track if on auth page
  isAuthPage = signal(false);

  constructor() {
    // Check initial URL
    this.checkAuthPage(this.router.url);

    // Subscribe to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkAuthPage(event.urlAfterRedirects || event.url);
    });
  }

  private checkAuthPage(url: string) {
    this.isAuthPage.set(url.includes('/login') || url.includes('/register'));
  }
}
