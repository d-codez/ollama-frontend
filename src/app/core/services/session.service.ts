import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly SESSION_KEY = 'userId';

  constructor() {}

  getSessionId(): string {
    let userId = localStorage.getItem(this.SESSION_KEY);
    if (!userId) {
      userId = this.generateSessionId();
      localStorage.setItem(this.SESSION_KEY, userId);
    }
    return userId;
  }

  private generateSessionId(): string {
    return 'user-' + Math.random().toString(36).substr(2, 9);
  }
}
