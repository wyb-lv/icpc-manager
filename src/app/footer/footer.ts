import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="py-3 mt-auto text-center border-top border-secondary small">
      ICPC Contest Manager &copy; 2025 - Developed by <strong>WyB</strong>
    </footer>
  `
})
export class FooterComponent {}