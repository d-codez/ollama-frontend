import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { WSResponse } from '../model/app.model';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocketSubject<WSResponse>;

  constructor(private sessionService: SessionService) {}

  connect() {
    const userId = this.sessionService.getSessionId();
    const url = `ws://localhost:3000?userId=${userId}`;
    this.socket = webSocket(url);
    return this.socket;
  }

  sendMessage(message: any) {
    if (this.socket) {
      this.socket.next(message);
    }
  }

  closeConnection() {
    if (this.socket) {
      this.socket.complete();
    }
  }

  onMessage() {
    return this.socket.asObservable();
  }
}
