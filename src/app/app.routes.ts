import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { ScoreboardComponent } from './scoreboard/scoreboard';
import { TeamsComponent } from './teams/teams';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { ContestComponent } from './contest/contest';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'contest', component: ContestComponent, canActivate: [authGuard] },
  { path: 'contest/:contestId/scoreboard', component: ScoreboardComponent, canActivate: [authGuard] },
  { path: 'teams', component: TeamsComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'home' }
];
